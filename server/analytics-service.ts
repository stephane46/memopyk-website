/**
 * Backend Analytics Service
 * MEMOPYK - Phase 5 GA4 Server-Side Tracking
 * 
 * Handles server-side event tracking to Google Analytics 4
 * using the Measurement Protocol API
 */

import { randomUUID } from 'crypto';

// GA4 Configuration
const GA4_MEASUREMENT_ID = process.env.VITE_GA4_ID || process.env.GA4_MEASUREMENT_ID || 'G-JLRWHE1HV4';
const GA4_API_SECRET = process.env.GA4_API_SECRET || '';
const GA4_MEASUREMENT_PROTOCOL_URL = 'https://www.google-analytics.com/mp/collect';

interface EventParams {
  [key: string]: any;
}

interface GA4Event {
  name: string;
  params: EventParams;
}

interface GA4Payload {
  client_id: string;
  user_id?: string;
  timestamp_micros?: number;
  non_personalized_ads?: boolean;
  events: GA4Event[];
}

/**
 * Analytics Service Class
 * Provides server-side tracking capabilities for GA4
 */
export class AnalyticsService {
  private measurementId: string;
  private apiSecret: string;
  private enabled: boolean;

  constructor() {
    this.measurementId = GA4_MEASUREMENT_ID;
    this.apiSecret = GA4_API_SECRET;
    this.enabled = !!this.apiSecret;

    if (!this.enabled) {
      console.warn('⚠️ GA4 API Secret not configured - server-side analytics disabled');
      console.warn('   Add GA4_API_SECRET to environment variables to enable backend tracking');
    } else {
      console.log('✅ Backend Analytics Service initialized');
    }
  }

  /**
   * Generate a client ID for server-side tracking
   * Uses UUID v4 format via Node.js crypto module
   */
  private generateClientId(): string {
    return randomUUID();
  }

  /**
   * Send event to GA4 Measurement Protocol
   * @param eventName - Name of the GA4 event
   * @param params - Event parameters
   * @param clientId - Optional client ID (generated if not provided)
   * @param userId - Optional user ID
   */
  async sendEvent(
    eventName: string,
    params: EventParams = {},
    clientId?: string,
    userId?: string
  ): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[GA4 Backend] Event skipped (no API secret): ${eventName}`);
      return false;
    }

    try {
      const payload: GA4Payload = {
        client_id: clientId || this.generateClientId(),
        events: [
          {
            name: eventName,
            params: {
              ...params,
              engagement_time_msec: '100', // Required parameter
              session_id: Date.now().toString(),
            },
          },
        ],
      };

      if (userId) {
        payload.user_id = userId;
      }

      const url = `${GA4_MEASUREMENT_PROTOCOL_URL}?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`✅ [GA4 Backend] Event sent: ${eventName}`, params);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ [GA4 Backend] Event failed: ${eventName}`, {
          status: response.status,
          error: errorText,
        });
        return false;
      }
    } catch (error) {
      // Graceful error handling - log but don't break the app
      console.error(`❌ [GA4 Backend] Error sending event: ${eventName}`, error);
      return false;
    }
  }

  /**
   * Track form submission event
   * @param formName - Name/ID of the form
   * @param formData - Additional form data to track
   * @param clientId - Optional client ID
   * @param userId - Optional user ID
   */
  async trackFormSubmission(
    formName: string,
    formData: EventParams = {},
    clientId?: string,
    userId?: string
  ): Promise<boolean> {
    return this.sendEvent(
      'form_submit',
      {
        form_name: formName,
        form_destination: formData.destination || 'unknown',
        ...formData,
      },
      clientId,
      userId
    );
  }

  /**
   * Track API action event
   * @param action - Name of the API action
   * @param actionData - Additional action data
   * @param clientId - Optional client ID
   * @param userId - Optional user ID
   */
  async trackApiAction(
    action: string,
    actionData: EventParams = {},
    clientId?: string,
    userId?: string
  ): Promise<boolean> {
    return this.sendEvent(
      'api_action',
      {
        action_name: action,
        action_category: actionData.category || 'general',
        ...actionData,
      },
      clientId,
      userId
    );
  }

  /**
   * Track conversion event
   * @param conversionName - Name of the conversion
   * @param value - Conversion value (optional)
   * @param currency - Currency code (default: EUR)
   * @param clientId - Optional client ID
   * @param userId - Optional user ID
   */
  async trackConversion(
    conversionName: string,
    value?: number,
    currency: string = 'EUR',
    clientId?: string,
    userId?: string
  ): Promise<boolean> {
    const params: EventParams = {
      conversion_name: conversionName,
    };

    if (value !== undefined) {
      params.value = value;
      params.currency = currency;
    }

    return this.sendEvent('conversion', params, clientId, userId);
  }

  /**
   * Track error event
   * @param errorType - Type of error
   * @param errorMessage - Error message
   * @param errorData - Additional error context
   * @param clientId - Optional client ID
   */
  async trackError(
    errorType: string,
    errorMessage: string,
    errorData: EventParams = {},
    clientId?: string
  ): Promise<boolean> {
    return this.sendEvent(
      'error_occurred',
      {
        error_type: errorType,
        error_message: errorMessage,
        ...errorData,
      },
      clientId
    );
  }

  /**
   * Validate event data before sending
   * @param eventName - Event name to validate
   * @param params - Parameters to validate
   */
  validateEvent(eventName: string, params: EventParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Event name validation
    if (!eventName || eventName.length === 0) {
      errors.push('Event name is required');
    }

    if (eventName.length > 40) {
      errors.push('Event name must be 40 characters or less');
    }

    // Parameter validation
    const paramCount = Object.keys(params).length;
    if (paramCount > 25) {
      errors.push(`Too many parameters (${paramCount}). Maximum is 25.`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
