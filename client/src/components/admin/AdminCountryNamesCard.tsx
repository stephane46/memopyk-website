// client/src/components/admin/AdminCountryNamesCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

// Tiny CSV parser (no external dep). Expects headers: iso3,display_name
function parseCsv(text: string): Array<{ iso3: string; display_name: string }> {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const isoIdx = header.indexOf("iso3");
  const nameIdx = header.indexOf("display_name");
  if (isoIdx === -1 || nameIdx === -1) {
    throw new Error('CSV must have headers: "iso3,display_name"');
  }
  const rows: Array<{ iso3: string; display_name: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (!cols.length) continue;
    const iso3 = (cols[isoIdx] ?? "").trim();
    const display_name = (cols[nameIdx] ?? "").trim();
    if (iso3 && display_name) rows.push({ iso3, display_name });
  }
  return rows;
}

type UploadResult = {
  ok?: boolean;
  lang?: "en" | "fr";
  processed?: number;
  inserted?: number;
  updated?: number;
  error?: string;
};

type SyncResult = {
  ok?: boolean;
  processed?: number;
  inserted?: number;
  updated_en?: number;
  updated_fr?: number;
  error?: string;
};

export default function AdminCountryNamesCard() {
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<Array<{ iso3: string; display_name: string }>>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState<false | "en" | "fr">(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function readFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    setParsedRows(rows);
    setFileName(file.name);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function handleBrowseClick() {
    inputRef.current?.click();
  }

  async function upload(lang: "en" | "fr") {
    if (!parsedRows.length) {
      setResult({ error: "Please select a CSV file first." });
      return;
    }
    try {
      setUploading(lang);
      setResult(null);
      // Build a CSV blob again from parsedRows (keeps format consistent)
      const header = "iso3,display_name\n";
      const body = parsedRows.map(r => `${r.iso3},${r.display_name}`).join("\n");
      const blob = new Blob([header + body], { type: "text/csv" });
      const form = new FormData();
      form.append("file", blob, fileName || `country_names_${lang}.csv`);

      const res = await fetch(`/api/admin/country-names/upload?lang=${lang}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ error: json?.error || "Upload failed." });
        return;
      }
      setResult(json);
    } catch (err: any) {
      setResult({ error: err?.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  function download(lang: "en" | "fr") {
    const url = `/api/admin/country-names/download?lang=${lang}`;
    // open in a new tab to trigger the file download
    window.open(url, "_blank");
  }

  async function syncFromLibrary() {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch("/api/admin/country-names/sync-from-library", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSyncResult({ error: json?.error || "Sync failed." });
        return;
      }
      setSyncResult(json);
    } catch (e: any) {
      setSyncResult({ error: e?.message || "Sync failed." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Admin · Country Names (EN / FR)</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full rounded-md border p-6 text-center ${dragOver ? "bg-muted" : ""}`}
        >
          <Upload className="mx-auto mb-2 h-6 w-6 opacity-70" />
          <div className="text-sm text-muted-foreground">
            Drag & drop a CSV file here (headers: <code>iso3,display_name</code>)<br />
            or
          </div>
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={handleBrowseClick}>
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
          {fileName && (
            <div className="mt-2 text-xs text-muted-foreground">
              Selected: <span className="font-medium">{fileName}</span> — {parsedRows.length} rows
            </div>
          )}
        </div>

        {/* Preview table */}
        {parsedRows.length > 0 && (
          <div className="rounded-md border">
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Preview (first 5 rows)
            </div>
            <div className="max-h-[260px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1">ISO-3</th>
                    <th className="px-2 py-1">Display name</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={r.iso3 + i} className="border-t">
                      <td className="px-2 py-1 font-mono">{r.iso3}</td>
                      <td className="px-2 py-1">{r.display_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result summary */}
        {result && (
          <div
            className={`rounded-md border p-3 text-sm ${
              result.error ? "border-red-300 text-red-700" : "border-green-300 text-green-700"
            }`}
          >
            {result.error ? (
              <div>{result.error}</div>
            ) : (
              <div className="space-y-1">
                <div><span className="font-medium">Language:</span> {result.lang?.toUpperCase()}</div>
                <div><span className="font-medium">Processed:</span> {result.processed}</div>
                <div><span className="font-medium">Inserted:</span> {result.inserted}</div>
                <div><span className="font-medium">Updated:</span> {result.updated}</div>
              </div>
            )}
          </div>
        )}

        {syncResult && (
          <div
            className={`rounded-md border p-3 text-sm ${
              syncResult.error ? "border-red-300 text-red-700" : "border-green-300 text-green-700"
            } mt-2`}
          >
            {syncResult.error ? (
              <div>{syncResult.error}</div>
            ) : (
              <div className="space-y-1">
                <div><span className="font-medium">Processed:</span> {syncResult.processed}</div>
                <div><span className="font-medium">Inserted:</span> {syncResult.inserted}</div>
                <div><span className="font-medium">Updated EN:</span> {syncResult.updated_en}</div>
                <div><span className="font-medium">Updated FR:</span> {syncResult.updated_fr}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => upload("en")}
          disabled={uploading !== false}
          className="gap-2"
        >
          {uploading === "en" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import EN
        </Button>

        <Button
          variant="secondary"
          onClick={() => upload("fr")}
          disabled={uploading !== false}
          className="gap-2"
        >
          {uploading === "fr" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importer FR
        </Button>

        {/* NEW: Download buttons */}
        <div className="mx-2 h-6 w-px bg-muted hidden sm:block" />

        <Button
          variant="outline"
          onClick={() => download("en")}
          disabled={uploading !== false}
        >
          Download EN
        </Button>
        <Button
          variant="outline"
          onClick={() => download("fr")}
          disabled={uploading !== false}
        >
          Télécharger FR
        </Button>

        <Button
          variant="outline"
          onClick={syncFromLibrary}
          disabled={syncing || uploading !== false}
          className="gap-2"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Sync from library
        </Button>

        <div className="ml-auto text-xs text-muted-foreground">
          Max file size: 2 MB · Expected headers: <code>iso3,display_name</code>
        </div>
      </CardFooter>
    </Card>
  );
}