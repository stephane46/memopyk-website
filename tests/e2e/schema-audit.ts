/**
 * Schema Audit Script
 *
 * Programmatically compares Drizzle ORM schema definitions in shared/schema.ts
 * against the actual Supabase PostgreSQL database.
 *
 * Usage:  npx tsx tests/e2e/schema-audit.ts
 *
 * Outputs:
 *   test-results/schema-audit/schema-audit.json   — full structured comparison
 *   test-results/schema-audit/SCHEMA_AUDIT_REPORT.md — human-readable report
 */

import 'dotenv/config';
import postgres from 'postgres';
import { getTableColumns, getTableName } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import every pgTable export from the schema
import {
  heroVideos,
  heroTextSettings,
  galleryItems,
  faqSections,
  faqs,
  contacts,
  legalDocuments,
  ctaSettings,
  whyMemopykCards,
  seoSettings,
  seoAuditLogs,
  analyticsSessions,
  analyticsViews,
  realtimeVisitors,
  performanceMetrics,
  analyticsExclusions,
  partners,
  blogPosts,
  blogTags,
  blogPostTags,
  blogGalleries,
  imageBank,
  imageLabels,
  imageLabelLinks,
  contentTopics,
  contentKeywords,
  contentWeeklyPlans,
  contentDailyAssignments,
  travelAgencyCodes,
  travelUploadSubmissions,
  helpScreens,
  helpFlows,
  aiContext,
} from '../../shared/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SchemaColumn {
  jsName: string;       // TypeScript property name (e.g. "createdAt")
  dbName: string;       // Actual DB column name (e.g. "created_at")
  sqlType: string;      // Drizzle's getSQLType() result (e.g. "uuid", "text")
  drizzleType: string;  // Drizzle column class (e.g. "PgUuid", "PgText")
  nullable: boolean;
  hasDefault: boolean;
  isPrimary: boolean;
}

interface DbColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;    // "YES" or "NO"
  column_default: string | null;
  character_maximum_length: number | null;
  udt_name: string;       // underlying type name (e.g. "int4", "uuid", "text")
}

type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

interface Finding {
  severity: Severity;
  table: string;
  column?: string;
  message: string;
  schemaInfo?: string;
  dbInfo?: string;
}

interface TableComparison {
  tableName: string;
  existsInDb: boolean;
  schemaColumns: SchemaColumn[];
  dbColumns: DbColumn[];
  findings: Finding[];
}

// ---------------------------------------------------------------------------
// All schema tables — single registry
// ---------------------------------------------------------------------------

const ALL_TABLES: Record<string, any> = {
  heroVideos,
  heroTextSettings,
  galleryItems,
  faqSections,
  faqs,
  contacts,
  legalDocuments,
  ctaSettings,
  whyMemopykCards,
  seoSettings,
  seoAuditLogs,
  analyticsSessions,
  analyticsViews,
  realtimeVisitors,
  performanceMetrics,
  analyticsExclusions,
  partners,
  blogPosts,
  blogTags,
  blogPostTags,
  blogGalleries,
  imageBank,
  imageLabels,
  imageLabelLinks,
  contentTopics,
  contentKeywords,
  contentWeeklyPlans,
  contentDailyAssignments,
  travelAgencyCodes,
  travelUploadSubmissions,
  helpScreens,
  helpFlows,
  aiContext,
};

// ---------------------------------------------------------------------------
// Type mapping: normalize Drizzle SQL types → information_schema data_type
// ---------------------------------------------------------------------------

/**
 * Maps a Drizzle getSQLType() string to the equivalent PostgreSQL
 * information_schema.columns data_type / udt_name values.
 *
 * Returns an array of acceptable DB type strings (lowercase) so we
 * can do a fuzzy match.
 */
function normalizeType(drizzleSqlType: string): string[] {
  const t = drizzleSqlType.toLowerCase().trim();

  // Direct / exact
  if (t === 'uuid') return ['uuid'];
  if (t === 'text') return ['text'];
  if (t === 'boolean') return ['boolean', 'bool'];
  if (t === 'integer') return ['integer', 'int4'];
  if (t === 'bigint') return ['bigint', 'int8'];
  if (t === 'serial') return ['integer', 'int4', 'serial'];       // serial is int4 under the hood
  if (t === 'bigserial') return ['bigint', 'int8', 'bigserial'];  // bigserial is int8
  if (t === 'jsonb') return ['jsonb'];
  if (t === 'json') return ['json'];
  if (t === 'numeric') return ['numeric'];
  if (t === 'real') return ['real', 'float4'];
  if (t === 'double precision') return ['double precision', 'float8'];

  // varchar with or without length
  if (t.startsWith('varchar')) return ['character varying', 'varchar'];

  // decimal
  if (t.startsWith('decimal') || t.startsWith('numeric')) return ['numeric'];

  // timestamp variants — treat timestamp and timestamptz as compatible
  if (t.includes('timestamp')) return ['timestamp without time zone', 'timestamp with time zone'];

  // Array types — Drizzle reports "text[]", "uuid[]" etc.
  // PostgreSQL information_schema reports data_type="ARRAY" and udt_name="_text", "_uuid" etc.
  if (t.endsWith('[]')) {
    const baseType = t.slice(0, -2); // "text", "uuid", "integer", etc.
    return ['ARRAY', `_${baseType}`, t];
  }

  // Fallback: return the raw value so at least exact matches work
  return [t];
}

// ---------------------------------------------------------------------------
// Step 1 — Extract schema metadata
// ---------------------------------------------------------------------------

function extractSchemaColumns(table: any): SchemaColumn[] {
  const cols = getTableColumns(table);
  const result: SchemaColumn[] = [];

  for (const [jsName, col] of Object.entries(cols) as [string, any][]) {
    result.push({
      jsName,
      dbName: col.name,
      sqlType: col.getSQLType?.() ?? 'unknown',
      drizzleType: col.columnType ?? 'unknown',
      nullable: !col.notNull,
      hasDefault: !!col.hasDefault,
      isPrimary: !!col.primary,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Step 2 — Query DB
// ---------------------------------------------------------------------------

async function queryDbColumns(sql: ReturnType<typeof postgres>): Promise<Map<string, DbColumn[]>> {
  const rows = await sql`
    SELECT table_name, column_name, data_type, is_nullable,
           column_default::text, character_maximum_length, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const map = new Map<string, DbColumn[]>();
  for (const row of rows) {
    const tableName = row.table_name as string;
    if (!map.has(tableName)) map.set(tableName, []);
    map.get(tableName)!.push({
      column_name: row.column_name as string,
      data_type: row.data_type as string,
      is_nullable: row.is_nullable as string,
      column_default: row.column_default as string | null,
      character_maximum_length: row.character_maximum_length as number | null,
      udt_name: row.udt_name as string,
    });
  }

  return map;
}

async function queryAllTableNames(sql: ReturnType<typeof postgres>): Promise<string[]> {
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map(r => r.table_name as string);
}

// ---------------------------------------------------------------------------
// Step 3 — Compare
// ---------------------------------------------------------------------------

function compareTables(
  schemaTableName: string,
  schemaCols: SchemaColumn[],
  dbColumnMap: Map<string, DbColumn[]>,
): TableComparison {
  const dbCols = dbColumnMap.get(schemaTableName) ?? [];
  const existsInDb = dbColumnMap.has(schemaTableName);
  const findings: Finding[] = [];

  if (!existsInDb) {
    findings.push({
      severity: 'CRITICAL',
      table: schemaTableName,
      message: `Table "${schemaTableName}" defined in schema but DOES NOT EXIST in the database`,
    });
    return { tableName: schemaTableName, existsInDb, schemaColumns: schemaCols, dbColumns: dbCols, findings };
  }

  const dbColMap = new Map<string, DbColumn>();
  for (const dc of dbCols) dbColMap.set(dc.column_name, dc);

  const schemaColNames = new Set<string>();

  // Check each schema column against DB
  for (const sc of schemaCols) {
    schemaColNames.add(sc.dbName);
    const dc = dbColMap.get(sc.dbName);

    if (!dc) {
      findings.push({
        severity: 'CRITICAL',
        table: schemaTableName,
        column: sc.dbName,
        message: `Schema column "${sc.dbName}" (JS: ${sc.jsName}) does NOT exist in DB — Drizzle queries will crash`,
        schemaInfo: `type=${sc.sqlType}, nullable=${sc.nullable}, hasDefault=${sc.hasDefault}`,
      });
      continue;
    }

    // Type comparison
    const acceptableTypes = normalizeType(sc.sqlType);
    const dbType = dc.data_type.toLowerCase();
    const dbUdt = dc.udt_name.toLowerCase();
    const typeMatches = acceptableTypes.some(at => at === dbType || at === dbUdt);

    if (!typeMatches) {
      findings.push({
        severity: 'WARNING',
        table: schemaTableName,
        column: sc.dbName,
        message: `Type mismatch for "${sc.dbName}": schema="${sc.sqlType}" (drizzle=${sc.drizzleType}), db="${dc.data_type}" (udt=${dc.udt_name})`,
        schemaInfo: sc.sqlType,
        dbInfo: `${dc.data_type} (udt: ${dc.udt_name})`,
      });
    }

    // Nullable comparison
    const dbNullable = dc.is_nullable === 'YES';
    if (sc.nullable !== dbNullable) {
      // Schema says NOT NULL but DB allows NULL → risk of NULL values breaking TS types
      // Schema says nullable but DB says NOT NULL → just info, DB is stricter
      const severity: Severity = !sc.nullable && dbNullable ? 'INFO' : 'INFO';
      findings.push({
        severity,
        table: schemaTableName,
        column: sc.dbName,
        message: `Nullable mismatch for "${sc.dbName}": schema=${sc.nullable ? 'nullable' : 'NOT NULL'}, db=${dbNullable ? 'nullable' : 'NOT NULL'}`,
        schemaInfo: sc.nullable ? 'nullable' : 'NOT NULL',
        dbInfo: dbNullable ? 'nullable' : 'NOT NULL',
      });
    }
  }

  // Check DB columns not in schema
  for (const dc of dbCols) {
    if (!schemaColNames.has(dc.column_name)) {
      findings.push({
        severity: 'WARNING',
        table: schemaTableName,
        column: dc.column_name,
        message: `DB column "${dc.column_name}" exists in DB but NOT in schema (type=${dc.data_type})`,
        dbInfo: `${dc.data_type}, nullable=${dc.is_nullable}, default=${dc.column_default ?? 'none'}`,
      });
    }
  }

  return { tableName: schemaTableName, existsInDb, schemaColumns: schemaCols, dbColumns: dbCols, findings };
}

// ---------------------------------------------------------------------------
// Step 4 — Generate reports
// ---------------------------------------------------------------------------

function generateMarkdown(
  comparisons: TableComparison[],
  dbOnlyTables: string[],
): string {
  const allFindings = comparisons.flatMap(c => c.findings);
  const criticals = allFindings.filter(f => f.severity === 'CRITICAL');
  const warnings = allFindings.filter(f => f.severity === 'WARNING');
  const infos = allFindings.filter(f => f.severity === 'INFO');

  const totalColumns = comparisons.reduce((sum, c) => sum + c.schemaColumns.length, 0);
  const totalDbColumns = comparisons.reduce((sum, c) => sum + c.dbColumns.length, 0);

  const lines: string[] = [];

  lines.push('# Schema vs Database Audit Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Method:** Automated (tests/e2e/schema-audit.ts)`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`**${comparisons.length} tables audited, ${totalColumns} schema columns, ${totalDbColumns} DB columns, ${allFindings.length} findings (${criticals.length} critical, ${warnings.length} warnings, ${infos.length} info)**`);
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| CRITICAL | ${criticals.length} |`);
  lines.push(`| WARNING  | ${warnings.length} |`);
  lines.push(`| INFO     | ${infos.length} |`);
  lines.push(`| DB-only tables (not in schema) | ${dbOnlyTables.length} |`);
  lines.push('');

  // CRITICAL
  if (criticals.length > 0) {
    lines.push('## CRITICAL Findings');
    lines.push('');
    for (const f of criticals) {
      lines.push(`- **${f.table}${f.column ? '.' + f.column : ''}**: ${f.message}`);
      if (f.schemaInfo) lines.push(`  - Schema: ${f.schemaInfo}`);
      if (f.dbInfo) lines.push(`  - DB: ${f.dbInfo}`);
    }
    lines.push('');
  }

  // WARNING
  if (warnings.length > 0) {
    lines.push('## WARNING Findings');
    lines.push('');
    for (const f of warnings) {
      lines.push(`- **${f.table}${f.column ? '.' + f.column : ''}**: ${f.message}`);
      if (f.schemaInfo) lines.push(`  - Schema: ${f.schemaInfo}`);
      if (f.dbInfo) lines.push(`  - DB: ${f.dbInfo}`);
    }
    lines.push('');
  }

  // INFO
  if (infos.length > 0) {
    lines.push('## INFO Findings');
    lines.push('');
    for (const f of infos) {
      lines.push(`- **${f.table}${f.column ? '.' + f.column : ''}**: ${f.message}`);
      if (f.schemaInfo) lines.push(`  - Schema: ${f.schemaInfo}`);
      if (f.dbInfo) lines.push(`  - DB: ${f.dbInfo}`);
    }
    lines.push('');
  }

  // DB-only tables
  if (dbOnlyTables.length > 0) {
    lines.push('## DB Tables Not In Schema');
    lines.push('');
    lines.push(`${dbOnlyTables.length} tables exist in the database but are not defined in the Drizzle schema.`);
    lines.push('This is expected for Supabase system tables and tables accessed via raw SQL.');
    lines.push('');
    for (const t of dbOnlyTables) {
      lines.push(`- ${t}`);
    }
    lines.push('');
  }

  // Full table-by-table comparison
  lines.push('---');
  lines.push('');
  lines.push('## Full Table-by-Table Comparison');
  lines.push('');

  for (const comp of comparisons) {
    const issueCount = comp.findings.length;
    const status = !comp.existsInDb ? 'MISSING' : issueCount === 0 ? 'OK' : `${issueCount} issue(s)`;
    lines.push(`### ${comp.tableName} — ${status}`);
    lines.push('');

    if (!comp.existsInDb) {
      lines.push('**Table does not exist in the database.**');
      lines.push('');
      continue;
    }

    lines.push('| Schema Column (JS → DB) | Schema Type | DB Type | DB UDT | Nullable Match | Status |');
    lines.push('|------------------------|-------------|---------|--------|----------------|--------|');

    const dbColMap = new Map<string, DbColumn>();
    for (const dc of comp.dbColumns) dbColMap.set(dc.column_name, dc);
    const schemaCoveredCols = new Set<string>();

    for (const sc of comp.schemaColumns) {
      schemaCoveredCols.add(sc.dbName);
      const dc = dbColMap.get(sc.dbName);
      if (!dc) {
        lines.push(`| ${sc.jsName} → ${sc.dbName} | ${sc.sqlType} | **MISSING** | — | — | CRITICAL |`);
        continue;
      }

      const acceptableTypes = normalizeType(sc.sqlType);
      const typeOk = acceptableTypes.some(at => at === dc.data_type.toLowerCase() || at === dc.udt_name.toLowerCase());
      const nullOk = sc.nullable === (dc.is_nullable === 'YES');
      const status = typeOk && nullOk ? 'OK' : !typeOk ? 'TYPE MISMATCH' : 'NULLABLE MISMATCH';

      lines.push(`| ${sc.jsName} → ${sc.dbName} | ${sc.sqlType} | ${dc.data_type} | ${dc.udt_name} | ${nullOk ? 'yes' : 'NO'} | ${status} |`);
    }

    // DB-only columns
    for (const dc of comp.dbColumns) {
      if (!schemaCoveredCols.has(dc.column_name)) {
        lines.push(`| — | — | ${dc.data_type} | ${dc.udt_name} | — | DB-ONLY: ${dc.column_name} |`);
      }
    }

    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by schema-audit.ts at ${new Date().toISOString()}*`);

  return lines.join('\n');
}

function generateJson(
  comparisons: TableComparison[],
  dbOnlyTables: string[],
): object {
  const allFindings = comparisons.flatMap(c => c.findings);

  return {
    generatedAt: new Date().toISOString(),
    method: 'automated',
    script: 'tests/e2e/schema-audit.ts',
    summary: {
      tablesAudited: comparisons.length,
      totalSchemaColumns: comparisons.reduce((s, c) => s + c.schemaColumns.length, 0),
      totalDbColumns: comparisons.reduce((s, c) => s + c.dbColumns.length, 0),
      totalFindings: allFindings.length,
      critical: allFindings.filter(f => f.severity === 'CRITICAL').length,
      warnings: allFindings.filter(f => f.severity === 'WARNING').length,
      info: allFindings.filter(f => f.severity === 'INFO').length,
      dbOnlyTables: dbOnlyTables.length,
    },
    findings: allFindings,
    tables: comparisons.map(c => ({
      tableName: c.tableName,
      existsInDb: c.existsInDb,
      schemaColumnCount: c.schemaColumns.length,
      dbColumnCount: c.dbColumns.length,
      findingCount: c.findings.length,
      schemaColumns: c.schemaColumns.map(sc => ({
        jsName: sc.jsName,
        dbName: sc.dbName,
        sqlType: sc.sqlType,
        drizzleType: sc.drizzleType,
        nullable: sc.nullable,
        hasDefault: sc.hasDefault,
        isPrimary: sc.isPrimary,
      })),
      dbColumns: c.dbColumns.map(dc => ({
        name: dc.column_name,
        dataType: dc.data_type,
        udtName: dc.udt_name,
        nullable: dc.is_nullable === 'YES',
        hasDefault: dc.column_default !== null,
        defaultValue: dc.column_default,
        maxLength: dc.character_maximum_length,
      })),
      findings: c.findings,
    })),
    dbOnlyTables,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('Set it in .env or pass it directly: DATABASE_URL=... npx tsx tests/e2e/schema-audit.ts');
    process.exit(1);
  }

  console.log('=== Schema Audit Script ===\n');

  // Connect
  console.log('Connecting to database...');
  const sql = postgres(dbUrl);

  try {
    // Step 1: Extract schema metadata
    console.log(`Extracting schema definitions from ${Object.keys(ALL_TABLES).length} tables...`);
    const schemaData = new Map<string, { varName: string; tableName: string; columns: SchemaColumn[] }>();

    for (const [varName, table] of Object.entries(ALL_TABLES)) {
      const tableName = getTableName(table);
      const columns = extractSchemaColumns(table);
      schemaData.set(tableName, { varName, tableName, columns });
    }

    const schemaTableNames = new Set(schemaData.keys());
    console.log(`  → ${schemaData.size} tables extracted`);

    // Step 2: Query DB
    console.log('Querying database schema...');
    const dbColumnMap = await queryDbColumns(sql);
    const allDbTables = await queryAllTableNames(sql);
    console.log(`  → ${allDbTables.length} tables in DB, ${dbColumnMap.size} with column data`);

    // Step 3: Compare
    console.log('Comparing...\n');
    const comparisons: TableComparison[] = [];

    for (const [tableName, data] of schemaData) {
      const comp = compareTables(tableName, data.columns, dbColumnMap);
      comparisons.push(comp);
    }

    // DB-only tables
    const dbOnlyTables = allDbTables.filter(t => !schemaTableNames.has(t));

    // Step 4: Output
    const outDir = path.resolve(__dirname, '../../test-results/schema-audit');
    fs.mkdirSync(outDir, { recursive: true });

    const jsonData = generateJson(comparisons, dbOnlyTables);
    const jsonPath = path.join(outDir, 'schema-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`JSON report: ${jsonPath}`);

    const mdContent = generateMarkdown(comparisons, dbOnlyTables);
    const mdPath = path.join(outDir, 'SCHEMA_AUDIT_REPORT.md');
    fs.writeFileSync(mdPath, mdContent);
    console.log(`Markdown report: ${mdPath}`);

    // Console summary
    const allFindings = comparisons.flatMap(c => c.findings);
    const criticals = allFindings.filter(f => f.severity === 'CRITICAL');
    const warnings = allFindings.filter(f => f.severity === 'WARNING');
    const infos = allFindings.filter(f => f.severity === 'INFO');

    console.log('\n=== RESULTS ===\n');
    console.log(`Tables audited:  ${comparisons.length}`);
    console.log(`Schema columns:  ${comparisons.reduce((s, c) => s + c.schemaColumns.length, 0)}`);
    console.log(`DB columns:      ${comparisons.reduce((s, c) => s + c.dbColumns.length, 0)}`);
    console.log(`Total findings:  ${allFindings.length}`);
    console.log(`  CRITICAL:      ${criticals.length}`);
    console.log(`  WARNING:       ${warnings.length}`);
    console.log(`  INFO:          ${infos.length}`);
    console.log(`DB-only tables:  ${dbOnlyTables.length}`);
    console.log('');

    if (criticals.length > 0) {
      console.log('CRITICAL FINDINGS:');
      for (const f of criticals) {
        console.log(`  ❌ ${f.table}${f.column ? '.' + f.column : ''}: ${f.message}`);
      }
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('WARNING FINDINGS:');
      for (const f of warnings) {
        console.log(`  ⚠️  ${f.table}${f.column ? '.' + f.column : ''}: ${f.message}`);
      }
      console.log('');
    }

    if (criticals.length > 0) {
      console.log('⛔ CRITICAL mismatches found — schema needs fixes!');
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('⚠️  Warnings found but no critical mismatches.');
      process.exit(0);
    } else {
      console.log('✅ All schema tables match the database. No issues found.');
      process.exit(0);
    }
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
