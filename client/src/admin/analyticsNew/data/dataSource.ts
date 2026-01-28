import { useEffect, useState } from "react";

export type DataSource = "live" | "mock" | "unknown";

let current: DataSource = "unknown";
let listeners: Array<(s: DataSource) => void> = [];

export function setDataSource(s: DataSource) {
  if (current === s) return;
  current = s;
  listeners.forEach((l) => l(current));
}

export function useDataSource(): DataSource {
  const [val, setVal] = useState<DataSource>(current);
  useEffect(() => {
    const l = (s: DataSource) => setVal(s);
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return val;
}