import { Request } from "express";

export interface WhereSpec {
  alias: string;
  dateCol: string;
  localeCol: string;
  refCol: string;
  deviceCol: string;
}

export interface WhereResult {
  sql: string;
  params: any[];
}

export function buildWhere(
  req: Request | any,
  spec: WhereSpec,
  excludeIpFilter = false
): WhereResult {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 0;

  // Date range filters
  if (req.query.from) {
    conditions.push(`${spec.alias}.${spec.dateCol} >= $${++paramIndex}::timestamp`);
    params.push(req.query.from);
  }
  if (req.query.to) {
    conditions.push(`${spec.alias}.${spec.dateCol} <= $${++paramIndex}::timestamp`);
    params.push(req.query.to);
  }

  // Language filter
  if (req.query.lang) {
    conditions.push(`${spec.alias}.${spec.localeCol} = $${++paramIndex}`);
    params.push(req.query.lang);
  }

  // Source/referrer filter
  if (req.query.source) {
    conditions.push(`${spec.alias}.${spec.refCol} ILIKE $${++paramIndex}`);
    params.push(`%${req.query.source}%`);
  }

  // Device filter (via user agent)
  if (req.query.device) {
    conditions.push(`${spec.alias}.user_agent ILIKE $${++paramIndex}`);
    params.push(`%${req.query.device}%`);
  }

  // Country filter (legacy support)
  if (req.query.country) {
    conditions.push(`${spec.alias}.country = $${++paramIndex}`);
    params.push(req.query.country);
  }

  // Exclude test/admin IP addresses unless explicitly disabled
  if (!excludeIpFilter) {
    conditions.push(`${spec.alias}.is_test_data = false`);
  }

  const sql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  return { sql, params };
}