/**
 * IP Exclusion Service
 *
 * Manages IP addresses to be excluded from analytics tracking.
 * Used to filter out developer/team traffic from all analytics data.
 */

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { analyticsExclusions } from "@shared/schema";

export interface IpExclusion {
  id: string;
  ipCidr: string;
  label: string;
  active: boolean;
  createdAt: Date | null;
  appliesFrom: Date | null;
}

/**
 * Get all IP exclusions from the database
 */
export async function getAllExclusions(): Promise<IpExclusion[]> {
  const rows = await db.select().from(analyticsExclusions);
  return rows;
}

/**
 * Add a new IP to the exclusion list
 */
export async function addExclusion(ip: string, reason?: string): Promise<IpExclusion> {
  const rows = await db
    .insert(analyticsExclusions)
    .values({
      ipCidr: ip,
      label: reason || "No reason provided",
      active: true,
    })
    .returning();
  return rows[0];
}

/**
 * Update the reason/label for an existing IP exclusion
 */
export async function updateExclusion(ip: string, reason: string): Promise<IpExclusion | null> {
  const rows = await db
    .update(analyticsExclusions)
    .set({ label: reason })
    .where(eq(analyticsExclusions.ipCidr, ip))
    .returning();
  return rows[0] || null;
}

/**
 * Remove an IP from the exclusion list
 */
export async function removeExclusion(ip: string): Promise<boolean> {
  const rows = await db
    .delete(analyticsExclusions)
    .where(eq(analyticsExclusions.ipCidr, ip))
    .returning();
  return rows.length > 0;
}

/**
 * Check if an IP is in the exclusion list
 * Supports both exact IP matches and CIDR range matching
 */
export async function isExcludedIP(ip: string): Promise<boolean> {
  const exclusions = await db
    .select()
    .from(analyticsExclusions)
    .where(eq(analyticsExclusions.active, true));

  for (const exclusion of exclusions) {
    if (isIPInCIDR(ip, exclusion.ipCidr)) {
      return true;
    }
  }
  return false;
}

/**
 * Helper: Check if an IP address falls within a CIDR range
 * Supports both exact IP matches (e.g., "192.168.1.1") and CIDR notation (e.g., "192.168.1.0/24")
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    // If CIDR is just an IP without mask, do exact match
    if (!cidr.includes("/")) {
      return ip === cidr;
    }

    const [range, bits] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(range);

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    // If parsing fails, fall back to exact string match
    return ip === cidr;
  }
}

/**
 * Helper: Convert IP address string to number for CIDR calculations
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

export default {
  getAllExclusions,
  addExclusion,
  updateExclusion,
  removeExclusion,
  isExcludedIP,
};
