import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

/**
 * AUTOMATIC ANALYTICS SYNC SERVICE
 * 
 * Self-healing system that automatically syncs JSON-only sessions to Supabase.
 * Runs periodically to catch up on sessions created during Supabase downtime.
 * 
 * Features:
 * - Duplicate prevention via upsert
 * - Batch processing (100 sessions at a time)
 * - Error recovery and logging
 * - Tracks last sync timestamp
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'analytics-sessions.json');
const SYNC_STATE_FILE = path.join(DATA_DIR, 'analytics-sync-state.json');

interface SyncState {
  lastSyncTimestamp: string;
  lastSyncedSessionId: string | null;
  totalSynced: number;
  lastError: string | null;
}

interface JsonSession {
  id: string;
  session_id: string;
  user_id?: string | null;
  ip_address: string;
  user_agent: string;
  referrer: string;
  language: string;
  country: string;
  country_iso2?: string | null;
  country_iso3?: string | null;
  city: string;
  region?: string;
  screen_resolution?: string;
  page_url?: string;
  timezone?: string;
  page_views?: number;
  is_bot?: boolean;
  is_test_data?: boolean;
  created_at: string;
  updated_at?: string;
  duration?: number;
}

/**
 * Load sync state from file
 */
function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const content = fs.readFileSync(SYNC_STATE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('⚠️ SYNC: Could not load sync state:', error);
  }
  
  return {
    lastSyncTimestamp: new Date(0).toISOString(),
    lastSyncedSessionId: null,
    totalSynced: 0,
    lastError: null
  };
}

/**
 * Save sync state to file
 */
function saveSyncState(state: SyncState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('❌ SYNC: Could not save sync state:', error);
  }
}

/**
 * Load sessions from JSON file
 */
function loadJsonSessions(): JsonSession[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const sessions = JSON.parse(content);
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    console.error('❌ SYNC: Could not load JSON sessions:', error);
    return [];
  }
}

/**
 * Get sessions that exist in JSON but not in Supabase
 */
async function getJsonOnlySessions(batchSize: number = 100): Promise<JsonSession[]> {
  const jsonSessions = loadJsonSessions();
  
  if (jsonSessions.length === 0) {
    return [];
  }
  
  console.log(`🔍 SYNC: Found ${jsonSessions.length} sessions in JSON`);
  
  // Get all session IDs from Supabase
  const { data: supabaseSessions, error } = await supabase
    .from('analytics_sessions')
    .select('session_id');
  
  if (error) {
    console.error('❌ SYNC: Could not query Supabase sessions:', error);
    throw error;
  }
  
  const supabaseSessionIds = new Set(
    (supabaseSessions || []).map((s: any) => s.session_id)
  );
  
  console.log(`🔍 SYNC: Found ${supabaseSessionIds.size} sessions in Supabase`);
  
  // Find sessions that exist in JSON but not in Supabase
  const jsonOnlySessions = jsonSessions.filter(
    session => !supabaseSessionIds.has(session.session_id)
  );
  
  console.log(`📊 SYNC: ${jsonOnlySessions.length} sessions need syncing`);
  
  // Return first batch
  return jsonOnlySessions.slice(0, batchSize);
}

/**
 * Sync a batch of sessions to Supabase using upsert
 */
async function syncSessionBatch(sessions: JsonSession[]): Promise<{ synced: number; errors: number }> {
  if (sessions.length === 0) {
    return { synced: 0, errors: 0 };
  }
  
  console.log(`📤 SYNC: Syncing batch of ${sessions.length} sessions...`);
  
  let synced = 0;
  let errors = 0;
  
  // Process sessions one by one to handle errors gracefully
  for (const session of sessions) {
    try {
      // Helper function to detect device category from user agent
      const detectDeviceCategory = (userAgent: string): string => {
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          return 'mobile';
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
          return 'tablet';
        }
        return 'desktop';
      };
      
      const sessionToInsert = {
        session_id: session.session_id,
        user_id: session.user_id || null,
        ip_address: session.ip_address || '0.0.0.0',
        user_agent: session.user_agent || '',
        referrer: session.referrer || '',
        language: session.language || 'en-US',
        country_iso2: session.country_iso2 || null,
        country_name: session.country || 'Unknown',
        device_category: detectDeviceCategory(session.user_agent || ''),
        screen_resolution: session.screen_resolution || '',
        timezone: session.timezone || 'UTC',
        first_seen_at: session.created_at,
        last_seen_at: session.updated_at || session.created_at,
        session_duration: session.duration || 0,
        page_count: session.page_views || 1,
        is_bounce: false,
        is_returning: false,
        country: session.country || 'Unknown',
        country_iso3: session.country_iso3 || null,
        city: session.city || 'Unknown',
        page_views: session.page_views || 0,
        duration: session.duration || 0,
        is_bot: session.is_bot || false,
        is_test_data: session.is_test_data || false,
        created_at: session.created_at,
        updated_at: session.updated_at || session.created_at
      };
      
      // Upsert to prevent duplicates (on conflict, do nothing)
      const { error } = await supabase
        .from('analytics_sessions')
        .upsert(sessionToInsert, {
          onConflict: 'session_id',
          ignoreDuplicates: true
        });
      
      if (error) {
        console.error(`❌ SYNC: Error syncing session ${session.session_id}:`, error.message);
        errors++;
      } else {
        synced++;
      }
    } catch (error) {
      console.error(`❌ SYNC: Exception syncing session ${session.session_id}:`, error);
      errors++;
    }
  }
  
  console.log(`✅ SYNC: Batch complete - ${synced} synced, ${errors} errors`);
  
  return { synced, errors };
}

/**
 * Main sync function - runs a complete sync cycle
 */
export async function runSync(): Promise<{ success: boolean; synced: number; errors: number }> {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 ANALYTICS SYNC: Starting automatic sync cycle...');
  console.log('='.repeat(80));
  
  const state = loadSyncState();
  let totalSynced = 0;
  let totalErrors = 0;
  
  try {
    // Check if Supabase is available
    const { error: healthError } = await supabase
      .from('analytics_sessions')
      .select('id')
      .limit(1);
    
    if (healthError) {
      console.log('⚠️ SYNC: Supabase not available, skipping sync');
      state.lastError = `Supabase unavailable: ${healthError.message}`;
      saveSyncState(state);
      return { success: false, synced: 0, errors: 0 };
    }
    
    console.log('✅ SYNC: Supabase connection healthy');
    
    // Process in batches until no more sessions to sync
    let hasMore = true;
    let batchCount = 0;
    const maxBatches = 50; // Safety limit: max 5000 sessions per sync
    
    while (hasMore && batchCount < maxBatches) {
      const batch = await getJsonOnlySessions(100);
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }
      
      batchCount++;
      const result = await syncSessionBatch(batch);
      totalSynced += result.synced;
      totalErrors += result.errors;
      
      // Small delay between batches to avoid overwhelming the database
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Update sync state
    state.lastSyncTimestamp = new Date().toISOString();
    state.totalSynced += totalSynced;
    state.lastError = totalErrors > 0 ? `${totalErrors} errors in last sync` : null;
    saveSyncState(state);
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ SYNC COMPLETE: ${totalSynced} sessions synced, ${totalErrors} errors`);
    console.log(`📊 SYNC STATS: Total lifetime synced: ${state.totalSynced}`);
    console.log('='.repeat(80) + '\n');
    
    return { success: true, synced: totalSynced, errors: totalErrors };
    
  } catch (error) {
    console.error('❌ SYNC: Fatal error during sync:', error);
    state.lastError = error instanceof Error ? error.message : 'Unknown error';
    saveSyncState(state);
    return { success: false, synced: totalSynced, errors: totalErrors + 1 };
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncState {
  return loadSyncState();
}
