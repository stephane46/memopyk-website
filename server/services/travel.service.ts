/**
 * Travel Upload Portal Service
 *
 * CRUD operations for travel upload submissions and agency codes.
 * Uses Drizzle ORM with raw SQL queries where needed (sql.raw doesn't support
 * parameterized queries, so we use escapeValue() helper for safety).
 */

import { eq, asc, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

/**
 * Helper function to escape values for sql.raw() queries.
 * Drizzle's sql.raw() doesn't support parameterized queries, so we must
 * escape values manually to prevent SQL injection.
 */
function escapeValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  // Escape single quotes by doubling them (SQL standard)
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// Travel Upload Submissions
// ---------------------------------------------------------------------------

export async function getTravelUploadSubmissions(filters?: {
  agencyCode?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  console.log('🔍 [Service] getTravelUploadSubmissions called with filters:', filters);
  let sqlQuery = `SELECT * FROM travel_upload_submissions WHERE 1=1`;

  if (filters) {
    if (filters.agencyCode) {
      sqlQuery += ` AND agency_code = ${escapeValue(filters.agencyCode)}`;
    }
    if (filters.startDate) {
      sqlQuery += ` AND created_at >= ${escapeValue(filters.startDate)}`;
    }
    if (filters.endDate) {
      sqlQuery += ` AND created_at <= ${escapeValue(filters.endDate)}`;
    }
    if (filters.search) {
      const searchPattern = escapeValue(`%${filters.search}%`);
      sqlQuery += ` AND (first_name ILIKE ${searchPattern} OR last_name ILIKE ${searchPattern} OR email ILIKE ${searchPattern})`;
    }
  }

  sqlQuery += ` ORDER BY created_at DESC`;

  console.log('📝 [Service] Executing SQL:', sqlQuery.substring(0, 150));
  const result = await db.execute(sql.raw(sqlQuery));
  const data = result.rows || result;
  console.log(`✅ [Service] Query returned ${Array.isArray(data) ? data.length : 0} rows`);
  return data;
}

export async function getTravelUploadSubmissionById(id: number) {
  const result = await db.execute(
    sql.raw(`SELECT * FROM travel_upload_submissions WHERE id = ${id}`)
  );
  const data = result.rows || result;
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return null;
}

export async function createTravelUploadSubmission(submissionData: any) {
  const columns = Object.keys(submissionData).join(', ');
  const values = Object.values(submissionData).map(escapeValue).join(', ');

  const insertQuery = `INSERT INTO travel_upload_submissions (${columns}) VALUES (${values}) RETURNING *`;
  const result = await db.execute(sql.raw(insertQuery));
  const data = result.rows || result;

  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error('Failed to create submission');
}

export async function updateTravelUploadSubmission(id: number, updates: any) {
  const updatesWithTimestamp = { ...updates, updated_at: new Date().toISOString() };
  const setClauses = Object.entries(updatesWithTimestamp)
    .map(([key, val]) => `${key} = ${escapeValue(val)}`)
    .join(', ');

  const updateQuery = `UPDATE travel_upload_submissions SET ${setClauses} WHERE id = ${id} RETURNING *`;
  const result = await db.execute(sql.raw(updateQuery));
  const data = result.rows || result;

  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error('Submission not found');
}

export async function deleteTravelUploadSubmission(id: number) {
  await db.execute(sql.raw(`DELETE FROM travel_upload_submissions WHERE id = ${id}`));
  return { success: true };
}

// ---------------------------------------------------------------------------
// Travel Agency Codes
// ---------------------------------------------------------------------------

export async function getTravelAgencyCodes(filters?: {
  isActive?: boolean;
  search?: string;
}) {
  console.log('🔍 [Service] getTravelAgencyCodes called with filters:', filters);
  let sqlQuery = `SELECT * FROM travel_agency_codes WHERE 1=1`;

  if (filters) {
    if (filters.isActive !== undefined) {
      sqlQuery += ` AND is_active = ${filters.isActive ? 'TRUE' : 'FALSE'}`;
    }
    if (filters.search) {
      const searchPattern = escapeValue(`%${filters.search}%`);
      sqlQuery += ` AND (agency_name ILIKE ${searchPattern} OR agency_code ILIKE ${searchPattern})`;
    }
  }

  sqlQuery += ` ORDER BY agency_name ASC`;

  console.log('📝 [Service] Executing SQL:', sqlQuery.substring(0, 150));
  const result = await db.execute(sql.raw(sqlQuery));
  const data = result.rows || result;
  console.log(`✅ [Service] Query returned ${Array.isArray(data) ? data.length : 0} rows`);
  return data;
}

export async function getTravelAgencyCodeById(id: number) {
  const result = await db.execute(
    sql.raw(`SELECT * FROM travel_agency_codes WHERE id = ${id}`)
  );
  const data = result.rows || result;
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return null;
}

/**
 * Get agency code by code (case-insensitive, active only).
 * Used for validation endpoint.
 */
export async function getTravelAgencyCodeByCode(code: string) {
  const upperCode = escapeValue(code.toUpperCase());
  const result = await db.execute(
    sql.raw(`SELECT * FROM travel_agency_codes WHERE UPPER(agency_code) = ${upperCode} AND is_active = TRUE`)
  );
  const data = result.rows || result;
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return null;
}

export async function createTravelAgencyCode(codeData: any) {
  // Ensure agency_code is stored uppercase for case-insensitive matching
  const dataWithUpperCode = { ...codeData, agency_code: codeData.agency_code?.toUpperCase() };
  const columns = Object.keys(dataWithUpperCode).join(', ');
  const values = Object.values(dataWithUpperCode).map(escapeValue).join(', ');

  const insertQuery = `INSERT INTO travel_agency_codes (${columns}) VALUES (${values}) RETURNING *`;
  const result = await db.execute(sql.raw(insertQuery));
  const data = result.rows || result;

  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error('Failed to create agency code');
}

export async function updateTravelAgencyCode(id: number, updates: any) {
  // Ensure agency_code is stored uppercase if being updated
  const updatesWithUpperCode = updates.agency_code
    ? { ...updates, agency_code: updates.agency_code.toUpperCase(), updated_at: new Date().toISOString() }
    : { ...updates, updated_at: new Date().toISOString() };

  const setClauses = Object.entries(updatesWithUpperCode)
    .map(([key, val]) => `${key} = ${escapeValue(val)}`)
    .join(', ');

  const updateQuery = `UPDATE travel_agency_codes SET ${setClauses} WHERE id = ${id} RETURNING *`;
  const result = await db.execute(sql.raw(updateQuery));
  const data = result.rows || result;

  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error('Agency code not found');
}

export async function deleteTravelAgencyCode(id: number) {
  await db.execute(sql.raw(`DELETE FROM travel_agency_codes WHERE id = ${id}`));
  return { success: true };
}
