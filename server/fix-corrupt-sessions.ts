import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'server', 'data');

function fixCorruptSessions() {
  console.log('🔧 Starting session repair...');
  
  try {
    // Read JSON file
    const filePath = join(DATA_DIR, 'analytics-sessions.json');
    const jsonData = readFileSync(filePath, 'utf-8');
    const sessions = JSON.parse(jsonData);
    
    console.log(`📊 Total sessions: ${sessions.length}`);
    
    // Find corrupt sessions
    const corruptSessions = sessions.filter((s: any) => !s.session_id);
    const validSessions = sessions.filter((s: any) => s.session_id);
    
    console.log(`❌ Corrupt sessions (missing session_id): ${corruptSessions.length}`);
    console.log(`✅ Valid sessions: ${validSessions.length}`);
    
    if (corruptSessions.length === 0) {
      console.log('✅ No corrupt sessions to fix!');
      return;
    }
    
    // Fix corrupt sessions by generating session IDs
    let fixedCount = 0;
    corruptSessions.forEach((session: any) => {
      // Generate session_id based on IP and timestamp
      const timestamp = session.created_at || session.updated_at || new Date().toISOString();
      const ip = session.ip_address || '0.0.0.0';
      const randomPart = Math.random().toString(36).substr(2, 9);
      
      // Format: session_TIMESTAMP_RANDOMPART
      const timestampMs = new Date(timestamp).getTime();
      session.session_id = `session_${timestampMs}_${randomPart}`;
      fixedCount++;
    });
    
    console.log(`🔧 Fixed ${fixedCount} sessions by generating session_id`);
    
    // Merge back together
    const allSessions = [...validSessions, ...corruptSessions];
    
    // Sort by created_at
    allSessions.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });
    
    // Save updated JSON
    writeFileSync(filePath, JSON.stringify(allSessions, null, 2));
    
    console.log('✅ Session repair complete!');
    console.log(`📊 Final count: ${allSessions.length} sessions (all valid)`);
    
  } catch (error: any) {
    console.error('❌ Session repair failed:', error.message);
    throw error;
  }
}

// Run repair
fixCorruptSessions();
console.log('\n✅ Done!');
