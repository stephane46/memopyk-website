/**
 * Analytics Database Service
 * Handles logging GA4 events to Supabase for long-term storage and analysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface AnalyticsEvent {
  event_name: string;
  event_value?: number;
  currency?: string;
  user_id?: string;
  session_id?: string;
  page_name?: string;
  page_path?: string;
  page_title?: string;
  form_name?: string;
  form_type?: string;
  form_language?: string;
  share_platform?: string;
  share_url?: string;
  scroll_percent?: number;
  video_title?: string;
  video_index?: number;
  gallery_item_title?: string;
  item_index?: number;
  partner_country?: string;
  services_selected?: string[];
  action?: string;
  page_location?: string;
  cta_id?: string;
  package?: string;
  language?: string;
  user_language?: string;
  user_timezone?: string;
  user_market_segment?: string;
  referrer?: string;
  user_agent?: string;
  [key: string]: any; // Allow additional dynamic fields
}

interface ConversionData {
  event_id: string;
  conversion_type: string;
  conversion_value: number;
  currency?: string;
  user_id?: string;
  session_id?: string;
  page_name?: string;
  page_path?: string;
}

class AnalyticsDBService {
  private supabase: SupabaseClient | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Analytics DB: Supabase credentials not found. Event logging to database disabled.');
      console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable database logging.');
      this.isEnabled = false;
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      this.isEnabled = true;
      console.log('✅ Analytics DB Service initialized');
    } catch (error) {
      console.error('❌ Analytics DB: Failed to initialize Supabase client:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Log an event to the analytics_events table
   */
  async logEvent(eventData: AnalyticsEvent): Promise<any> {
    if (!this.isEnabled || !this.supabase) {
      // Silently skip if not enabled (don't spam logs)
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('analytics_events')
        .insert([{
          event_name: eventData.event_name,
          event_value: eventData.event_value || null,
          currency: eventData.currency || 'EUR',
          user_id: eventData.user_id || null,
          session_id: eventData.session_id || null,
          page_name: eventData.page_name || null,
          page_path: eventData.page_path || null,
          page_title: eventData.page_title || null,
          form_name: eventData.form_name || null,
          form_type: eventData.form_type || null,
          form_language: eventData.form_language || null,
          share_platform: eventData.share_platform || null,
          scroll_percent: eventData.scroll_percent || null,
          video_title: eventData.video_title || null,
          video_index: eventData.video_index || null,
          gallery_item_title: eventData.gallery_item_title || null,
          item_index: eventData.item_index || null,
          partner_country: eventData.partner_country || null,
          services_selected: eventData.services_selected || null,
          action: eventData.action || null,
          page_location: eventData.page_location || null,
          cta_id: eventData.cta_id || null,
          package: eventData.package || null,
          language: eventData.language || null,
          user_language: eventData.user_language || null,
          user_timezone: eventData.user_timezone || null,
          referrer: eventData.referrer || null,
          user_agent: eventData.user_agent || null
        }])
        .select('event_id')
        .single();

      if (error) {
        console.error('Analytics DB: Event logging failed:', error.message);
        return null;
      }

      // If event has value, also log as conversion
      if (eventData.event_value && eventData.event_value > 0 && data?.event_id) {
        await this.logConversion({
          event_id: data.event_id,
          conversion_type: eventData.event_name,
          conversion_value: eventData.event_value,
          currency: eventData.currency,
          user_id: eventData.user_id,
          session_id: eventData.session_id,
          page_name: eventData.page_name,
          page_path: eventData.page_path
        });
      }

      return data;
    } catch (err) {
      console.error('Analytics DB: Unexpected error logging event:', err);
      return null;
    }
  }

  /**
   * Log a conversion to the analytics_conversions table
   */
  async logConversion(conversionData: ConversionData): Promise<any> {
    if (!this.isEnabled || !this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('analytics_conversions')
        .insert([{
          event_id: conversionData.event_id,
          conversion_type: conversionData.conversion_type,
          conversion_value: conversionData.conversion_value,
          currency: conversionData.currency || 'EUR',
          user_id: conversionData.user_id || null,
          session_id: conversionData.session_id || null,
          page_name: conversionData.page_name || null,
          page_path: conversionData.page_path || null
        }]);

      if (error) {
        console.error('Analytics DB: Conversion logging failed:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Analytics DB: Unexpected error logging conversion:', err);
      return null;
    }
  }

  /**
   * Update daily summary for a specific date
   * This aggregates event data into the analytics_daily_summary table
   */
  async updateDailySummary(summaryDate?: string): Promise<any> {
    if (!this.isEnabled || !this.supabase) {
      return null;
    }

    const dateToSummarize = summaryDate || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await this.supabase.rpc('update_daily_analytics', {
        p_date: dateToSummarize
      });

      if (error) {
        console.error('Analytics DB: Daily summary update failed:', error.message);
        return null;
      }

      console.log(`✅ Analytics DB: Daily summary updated for ${dateToSummarize}`);
      return data;
    } catch (err) {
      console.error('Analytics DB: Unexpected error updating daily summary:', err);
      return null;
    }
  }

  /**
   * Get conversion totals for a date range
   */
  async getConversionTotals(startDate: string, endDate: string): Promise<any> {
    if (!this.isEnabled || !this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('analytics_conversions')
        .select('conversion_type, conversion_value, currency')
        .gte('conversion_date', startDate)
        .lte('conversion_date', endDate);

      if (error) {
        console.error('Analytics DB: Failed to fetch conversion totals:', error.message);
        return null;
      }

      // Aggregate by conversion type
      const totals: Record<string, number> = {};
      data?.forEach((conversion: any) => {
        if (!totals[conversion.conversion_type]) {
          totals[conversion.conversion_type] = 0;
        }
        totals[conversion.conversion_type] += parseFloat(conversion.conversion_value);
      });

      return totals;
    } catch (err) {
      console.error('Analytics DB: Unexpected error fetching conversion totals:', err);
      return null;
    }
  }

  /**
   * Log performance metrics to the performance_metrics table
   */
  async logPerformanceMetric(performanceData: any): Promise<any> {
    if (!this.isEnabled || !this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .insert([{
          page_name: performanceData.page_name || null,
          page_path: performanceData.page_path || null,
          lcp_value: performanceData.lcp_value || null,
          lcp_rating: performanceData.lcp_rating || null,
          cls_value: performanceData.cls_value || null,
          cls_rating: performanceData.cls_rating || null,
          inp_value: performanceData.inp_value || null,
          inp_rating: performanceData.inp_rating || null,
          fid_value: performanceData.fid_value || null,
          fid_rating: performanceData.fid_rating || null,
          dns_time: performanceData.dns_time || null,
          tcp_time: performanceData.tcp_time || null,
          ttfb: performanceData.ttfb || null,
          dom_interactive: performanceData.dom_interactive || null,
          dom_complete: performanceData.dom_complete || null,
          page_load_time: performanceData.page_load_time || null,
          resource_count: performanceData.resource_count || null,
          transfer_size: performanceData.transfer_size || null,
          device_type: performanceData.device_type || null,
          browser_name: performanceData.browser_name || null,
          connection_type: performanceData.connection_type || null
        }]);

      if (error) {
        console.error('Analytics DB: Performance metric logging failed:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Analytics DB: Unexpected error logging performance metric:', err);
      return null;
    }
  }

  /**
   * Update daily performance summary for a specific date
   */
  async updateDailyPerformanceSummary(summaryDate?: string): Promise<any> {
    if (!this.isEnabled || !this.supabase) {
      return null;
    }

    const dateToSummarize = summaryDate || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await this.supabase.rpc('update_daily_performance', {
        p_date: dateToSummarize
      });

      if (error) {
        console.error('Analytics DB: Daily performance summary update failed:', error.message);
        return null;
      }

      console.log(`✅ Analytics DB: Daily performance summary updated for ${dateToSummarize}`);
      return data;
    } catch (err) {
      console.error('Analytics DB: Unexpected error updating daily performance summary:', err);
      return null;
    }
  }

  /**
   * Check if the service is enabled and ready
   */
  isReady(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export default new AnalyticsDBService();
