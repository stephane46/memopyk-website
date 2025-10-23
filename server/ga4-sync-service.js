// GA4 BigQuery → Supabase Sync Service
// Syncs GA4 events from BigQuery to Supabase PostgreSQL daily

const { BigQuery } = require('@google-cloud/bigquery');
const { createClient } = require('@supabase/supabase-js');
const countries = require('i18n-iso-countries');
const en = require('i18n-iso-countries/langs/en.json');
countries.registerLocale(en);

class GA4SyncService {
  constructor() {
    // GA4 Configuration
    this.GA4_PROPERTY_ID = 'G-JLRWHE1HV4';
    this.BIGQUERY_PROJECT_ID = process.env.GCP_PROJECT_ID;
    this.BIGQUERY_DATASET = `analytics_${this.GA4_PROPERTY_ID.replace('G-', '')}`;
    
    // Supabase Configuration  
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // BigQuery Configuration
    this.bigquery = new BigQuery({
      projectId: this.BIGQUERY_PROJECT_ID,
      credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY)
    });
    
    // Country aliases for geo mapping
    this.COUNTRY_ALIASES = new Map([
      ["usa", "United States"],
      ["u.s.a.", "United States"],
      ["us", "United States"],
      ["uk", "United Kingdom"],
      ["u.k.", "United Kingdom"],
      ["south korea", "Korea, Republic of"],
      ["north korea", "Korea, Democratic People's Republic of"],
      ["russia", "Russian Federation"],
      ["vietnam", "Viet Nam"],
      ["laos", "Lao People's Democratic Republic"],
      ["moldova", "Moldova, Republic of"],
      ["iran", "Iran, Islamic Republic of"],
      ["syria", "Syrian Arab Republic"],
      ["tanzania", "Tanzania, United Republic of"],
      ["bolivia", "Bolivia, Plurinational State of"],
      ["venezuela", "Venezuela, Bolivarian Republic of"],
      ["czech republic", "Czechia"],
      ["cape verde", "Cabo Verde"],
      ["ivory coast", "Côte d'Ivoire"],
      ["congo-brazzaville", "Congo"],
      ["congo-kinshasa", "Congo, The Democratic Republic of the"],
      ["palestine", "Palestine, State of"],
      ["swaziland", "Eswatini"],
      ["macedonia", "North Macedonia"],
    ]);
    
    console.log(`🔄 GA4 Sync Service initialized`);
    console.log(`📊 Property: ${this.GA4_PROPERTY_ID}`);
    console.log(`🗄️ Dataset: ${this.BIGQUERY_DATASET}`);
  }

  // Get yesterday's date in YYYYMMDD format (BigQuery table suffix)
  getYesterdayTableSuffix() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10).replace(/-/g, '');
  }

  // Normalize country name using aliases
  normalizeCountryName(name) {
    if (!name) return "";
    const n = String(name).trim().toLowerCase();
    return this.COUNTRY_ALIASES.get(n) || name;
  }

  // Resolve country ISO codes from country name
  resolveCountryCodes(countryName) {
    if (!countryName) return { iso2: null, iso3: null };
    const canonical = this.normalizeCountryName(countryName);
    
    // Try exact match
    let iso2 = countries.getAlpha2Code(canonical, "en");
    if (!iso2) {
      // Try loose match over all names
      const candidates = countries.getNames("en");
      const target = canonical.toLowerCase();
      for (const [code2, label] of Object.entries(candidates)) {
        if (label.toLowerCase() === target) { 
          iso2 = code2; 
          break; 
        }
      }
    }
    if (!iso2) {
      // Log unresolved countries for debugging
      if (countryName && countryName !== "Unknown") {
        console.warn("[geo] Unresolved country:", countryName);
      }
      return { iso2: null, iso3: null };
    }
    const iso3 = countries.alpha2ToAlpha3(iso2) || null;
    return { iso2, iso3 };
  }

  // Start sync run tracking
  async startSyncRun(syncDate) {
    const { data, error } = await this.supabase
      .from('analytics_sync_runs')
      .insert({
        sync_date: syncDate,
        start_time: new Date().toISOString(),
        status: 'running',
        records_processed: {},
        errors_count: 0
      })
      .select()
      .single();
      
    if (error) throw error;
    return data.id;
  }

  // Complete sync run tracking
  async completeSyncRun(runId, recordsProcessed, errorsCount = 0, errorDetails = null) {
    const { error } = await this.supabase
      .from('analytics_sync_runs')
      .update({
        end_time: new Date().toISOString(),
        status: errorsCount > 0 ? 'completed_with_errors' : 'completed',
        records_processed: recordsProcessed,
        errors_count: errorsCount,
        error_details: errorDetails
      })
      .eq('id', runId);
      
    if (error) throw error;
  }

  // Extract sessions from GA4 events
  async extractSessions(tableName) {
    const query = `
      WITH session_data AS (
        SELECT 
          CONCAT(user_pseudo_id, '_', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')) as session_id,
          user_pseudo_id,
          MIN(TIMESTAMP_MICROS(event_timestamp)) as first_seen_at,
          MAX(TIMESTAMP_MICROS(event_timestamp)) as last_seen_at,
          FIRST_VALUE(geo.country) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as country,
          FIRST_VALUE(geo.city) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as city,
          FIRST_VALUE(device.language) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as language,
          FIRST_VALUE(device.category) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as device_category,
          FIRST_VALUE(device.operating_system) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as os,
          FIRST_VALUE(device.web_info.browser) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as browser,
          FIRST_VALUE(traffic_source.source) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) as referrer,
          COUNTIF(event_name = 'first_visit') = 0 as is_returning,
          COUNT(*) as total_events,
          COUNTIF(event_name = 'page_view') as total_pageviews,
          COALESCE(
            CAST((MAX(TIMESTAMP_MICROS(event_timestamp)) - MIN(TIMESTAMP_MICROS(event_timestamp))) AS INT64) / 1000000,
            0
          ) as session_duration_seconds
        FROM \`${this.BIGQUERY_PROJECT_ID}.${this.BIGQUERY_DATASET}.${tableName}\`
        WHERE user_pseudo_id IS NOT NULL
        GROUP BY session_id, user_pseudo_id
      )
      SELECT DISTINCT * FROM session_data
    `;
    
    const [job] = await this.bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return rows;
  }

  // Extract pageviews from GA4 events
  async extractPageviews(tableName) {
    const query = `
      SELECT 
        TIMESTAMP_MICROS(event_timestamp) as event_timestamp,
        CONCAT(user_pseudo_id, '_', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')) as session_id,
        user_pseudo_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') as page_path,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title') as page_title,
        traffic_source.source as referrer,
        device.language as locale,
        event_timestamp as ga4_event_timestamp
      FROM \`${this.BIGQUERY_PROJECT_ID}.${this.BIGQUERY_DATASET}.${tableName}\`
      WHERE event_name = 'page_view'
      AND user_pseudo_id IS NOT NULL
      ORDER BY event_timestamp
    `;
    
    const [job] = await this.bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return rows;
  }

  // Extract video events from GA4 events
  async extractVideoEvents(tableName) {
    const query = `
      SELECT 
        event_name,
        TIMESTAMP_MICROS(event_timestamp) as event_timestamp,
        CONCAT(user_pseudo_id, '_', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')) as session_id,
        user_pseudo_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') as video_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_title') as video_title,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'gallery') as gallery,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'player') as player,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'locale') as locale,
        (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'current_time') as current_time_seconds,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'progress_percent') as progress_percent,
        (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'watch_time_seconds') as watch_time_seconds,
        event_timestamp as ga4_event_timestamp
      FROM \`${this.BIGQUERY_PROJECT_ID}.${this.BIGQUERY_DATASET}.${tableName}\`
      WHERE event_name IN ('video_start', 'video_pause', 'video_progress', 'video_complete')
      AND user_pseudo_id IS NOT NULL
      AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') IS NOT NULL
      ORDER BY event_timestamp
    `;
    
    const [job] = await this.bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return rows;
  }

  // Extract CTA clicks from GA4 events
  async extractCtaClicks(tableName) {
    const query = `
      SELECT 
        TIMESTAMP_MICROS(event_timestamp) as event_timestamp,
        CONCAT(user_pseudo_id, '_', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')) as session_id,
        user_pseudo_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_path') as page_path,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_id') as cta_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'locale') as locale,
        event_timestamp as ga4_event_timestamp
      FROM \`${this.BIGQUERY_PROJECT_ID}.${this.BIGQUERY_DATASET}.${tableName}\`
      WHERE event_name = 'cta_click'
      AND user_pseudo_id IS NOT NULL
      AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_id') IS NOT NULL
      ORDER BY event_timestamp
    `;
    
    const [job] = await this.bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return rows;
  }

  // Upsert sessions to Supabase with ISO code resolution
  async upsertSessions(sessions) {
    if (sessions.length === 0) return 0;
    
    // Enhance sessions with ISO codes
    const enhancedSessions = sessions.map(session => {
      const countryName = session.country || null;
      const { iso2, iso3 } = this.resolveCountryCodes(countryName);
      
      return {
        ...session,
        country_iso2: iso2,
        country_iso3: iso3
      };
    });
    
    const { data, error } = await this.supabase
      .from('analytics_sessions')
      .upsert(enhancedSessions, { 
        onConflict: 'session_id',
        ignoreDuplicates: false 
      });
      
    if (error) throw error;
    return enhancedSessions.length;
  }

  // Upsert pageviews to Supabase
  async upsertPageviews(pageviews) {
    if (pageviews.length === 0) return 0;
    
    // Batch insert to handle large datasets
    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < pageviews.length; i += batchSize) {
      const batch = pageviews.slice(i, i + batchSize);
      
      const { data, error } = await this.supabase
        .from('analytics_pageviews')
        .upsert(batch, { 
          onConflict: 'ga4_event_timestamp,user_pseudo_id,page_path',
          ignoreDuplicates: true 
        });
        
      if (error) throw error;
      totalInserted += batch.length;
    }
    
    return totalInserted;
  }

  // Upsert video events to Supabase
  async upsertVideoEvents(videoEvents) {
    if (videoEvents.length === 0) return 0;
    
    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < videoEvents.length; i += batchSize) {
      const batch = videoEvents.slice(i, i + batchSize);
      
      const { data, error } = await this.supabase
        .from('analytics_video_events')
        .upsert(batch, { 
          onConflict: 'ga4_event_timestamp,user_pseudo_id,event_name,video_id',
          ignoreDuplicates: true 
        });
        
      if (error) throw error;
      totalInserted += batch.length;
    }
    
    return totalInserted;
  }

  // Upsert CTA clicks to Supabase
  async upsertCtaClicks(ctaClicks) {
    if (ctaClicks.length === 0) return 0;
    
    const { data, error } = await this.supabase
      .from('analytics_cta_clicks')
      .upsert(ctaClicks, { 
        onConflict: 'ga4_event_timestamp,user_pseudo_id,cta_id',
        ignoreDuplicates: true 
      });
      
    if (error) throw error;
    return ctaClicks.length;
  }

  // Main sync function
  async syncYesterdayData() {
    const tableSuffix = this.getYesterdayTableSuffix();
    const tableName = `events_${tableSuffix}`;
    const syncDate = tableSuffix.slice(0, 4) + '-' + tableSuffix.slice(4, 6) + '-' + tableSuffix.slice(6, 8);
    
    console.log(`🔄 Starting GA4 sync for ${syncDate} (table: ${tableName})`);
    
    const runId = await this.startSyncRun(syncDate);
    const recordsProcessed = {};
    let totalErrors = 0;
    const errorDetails = [];
    
    try {
      // Check if BigQuery table exists
      const [tables] = await this.bigquery.dataset(this.BIGQUERY_DATASET).getTables();
      const tableExists = tables.some(table => table.id === tableName);
      
      if (!tableExists) {
        throw new Error(`BigQuery table ${this.BIGQUERY_DATASET}.${tableName} not found`);
      }
      
      // Extract and sync sessions
      console.log('📊 Extracting sessions...');
      const sessions = await this.extractSessions(tableName);
      recordsProcessed.sessions = await this.upsertSessions(sessions);
      console.log(`✅ Synced ${recordsProcessed.sessions} sessions`);
      
      // Extract and sync pageviews
      console.log('📄 Extracting pageviews...');
      const pageviews = await this.extractPageviews(tableName);
      recordsProcessed.pageviews = await this.upsertPageviews(pageviews);
      console.log(`✅ Synced ${recordsProcessed.pageviews} pageviews`);
      
      // Extract and sync video events
      console.log('🎬 Extracting video events...');
      const videoEvents = await this.extractVideoEvents(tableName);
      recordsProcessed.video_events = await this.upsertVideoEvents(videoEvents);
      console.log(`✅ Synced ${recordsProcessed.video_events} video events`);
      
      // Extract and sync CTA clicks
      console.log('🎯 Extracting CTA clicks...');
      const ctaClicks = await this.extractCtaClicks(tableName);
      recordsProcessed.cta_clicks = await this.upsertCtaClicks(ctaClicks);
      console.log(`✅ Synced ${recordsProcessed.cta_clicks} CTA clicks`);
      
      await this.completeSyncRun(runId, recordsProcessed, totalErrors);
      
      console.log(`🎉 GA4 sync completed successfully for ${syncDate}`);
      console.log(`📊 Records processed:`, recordsProcessed);
      
      return { success: true, recordsProcessed, errors: totalErrors };
      
    } catch (error) {
      console.error(`❌ GA4 sync failed for ${syncDate}:`, error);
      errorDetails.push(error.message);
      totalErrors++;
      
      await this.completeSyncRun(runId, recordsProcessed, totalErrors, error.message);
      
      return { success: false, error: error.message, recordsProcessed };
    }
  }
}

module.exports = GA4SyncService;