/**
 * Database Configuration and Connection Testing
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Simple query to test connection
    await db.execute(sql`SELECT 1 as test`);
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}

/**
 * Database health check with timing
 */
export async function getDatabaseHealth(): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await db.execute(sql`SELECT 1`);
    return {
      connected: true,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
