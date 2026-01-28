import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface EnrichmentJobState {
  state: 'queued' | 'running' | 'success' | 'error' | 'degraded' | 'idle';
  progress: number;
  startedAt: number;
  ttl: number;
  jobId: string | null;
  totalIPs?: number;
  processedIPs?: number;
  error?: string;
  stats?: {
    activeJobs: number;
    circuitBreakerOpen: boolean;
    circuitBreakerFailures: number;
  };
}

export interface EnrichmentParams {
  dateFrom?: string;
  dateTo?: string;
  language?: string;
  includeProduction?: boolean;
}

/**
 * Hook for triggering location enrichment with deduplication
 * Prevents multiple enrichment requests for the same parameters within 60 seconds
 */
export function useEnrichLocations() {
  const queryClient = useQueryClient();
  const lastTriggeredRef = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_MS = 60000; // 60 seconds
  
  const generateKey = (params: EnrichmentParams): string => {
    return `${params.dateFrom}_${params.dateTo}_${params.language || 'all'}_${params.includeProduction}`;
  };

  return useMutation({
    mutationFn: async (params: EnrichmentParams) => {
      const key = generateKey(params);
      const now = Date.now();
      const lastTriggered = lastTriggeredRef.current.get(key);
      
      // Check if we recently triggered for these parameters
      if (lastTriggered && now - lastTriggered < DEBOUNCE_MS) {
        console.log(`🔄 EnrichLocations: Skipping duplicate request for ${key} (${now - lastTriggered}ms ago)`);
        throw new Error(`Enrichment already triggered recently for this date range. Please wait ${Math.ceil((DEBOUNCE_MS - (now - lastTriggered)) / 1000)} seconds.`);
      }
      
      // Mark as triggered
      lastTriggeredRef.current.set(key, now);
      
      console.log(`🚀 EnrichLocations: Triggering enrichment for ${key}`);
      
      const response = await apiRequest('/api/analytics/enrich-locations', 'POST', params);
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      console.log(`✅ EnrichLocations: Job started`, data);
      
      // Invalidate related queries to refresh visitor data when enrichment completes
      if (data.state === 'success') {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/analytics/recent-visitors'] 
        });
      }
    },
    onError: (error, variables) => {
      console.error(`❌ EnrichLocations: Failed to start enrichment`, error);
    }
  });
}

/**
 * Hook for polling enrichment job status
 * Automatically starts/stops polling based on job state
 */
export function useEnrichmentStatus(params: EnrichmentParams, options: {
  enabled?: boolean;
  pollInterval?: number;
} = {}) {
  const { enabled = true, pollInterval = 3000 } = options;
  const queryClient = useQueryClient();
  
  const query = useQuery<EnrichmentJobState>({
    queryKey: ['/api/analytics/enrich-locations/status', params.dateFrom, params.dateTo, params.language, params.includeProduction],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) searchParams.append('dateTo', params.dateTo);
      if (params.language) searchParams.append('language', params.language);
      if (params.includeProduction !== undefined) searchParams.append('includeProduction', params.includeProduction.toString());
      
      const response = await fetch(`/api/analytics/enrich-locations/status?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }
      return response.json();
    },
    enabled,
    refetchInterval: (data) => {
      // Only poll if job is running or queued
      if (data && (data.state === 'running' || data.state === 'queued')) {
        return pollInterval;
      }
      return false; // Stop polling when job is done
    },
    staleTime: 0, // Always fresh status
  });

  // Invalidate visitor queries when enrichment completes
  const prevState = useRef<string | null>(null);
  
  if (query.data?.state === 'success' && prevState.current === 'running') {
    console.log(`✅ EnrichmentStatus: Job completed, refreshing visitor data`);
    queryClient.invalidateQueries({ 
      queryKey: ['/api/analytics/recent-visitors'] 
    });
  }
  
  if (query.data) {
    prevState.current = query.data.state;
  }

  return {
    ...query,
    isPolling: query.data?.state === 'running' || query.data?.state === 'queued',
    isCompleted: query.data?.state === 'success',
    isFailed: query.data?.state === 'error',
    isDegraded: query.data?.state === 'degraded',
    progress: query.data?.progress || 0,
    jobId: query.data?.jobId,
    stats: query.data?.stats
  };
}

/**
 * Combined hook that provides both enrichment trigger and status
 * Automatically starts polling when enrichment is triggered
 */
export function useLocationEnrichmentManager(params: EnrichmentParams) {
  const [isEnrichmentTriggered, setIsEnrichmentTriggered] = useState(false);
  
  const enrichMutation = useEnrichLocations();
  const statusQuery = useEnrichmentStatus(params, {
    enabled: isEnrichmentTriggered,
    pollInterval: 3000
  });

  const triggerEnrichment = async () => {
    try {
      setIsEnrichmentTriggered(true);
      await enrichMutation.mutateAsync(params);
    } catch (error) {
      // Don't set triggered to false on error - let user retry manually
      console.error('Failed to trigger enrichment:', error);
      throw error;
    }
  };

  const reset = () => {
    setIsEnrichmentTriggered(false);
    enrichMutation.reset();
  };

  return {
    // Trigger function
    triggerEnrichment,
    reset,
    
    // Status
    ...statusQuery,
    isTriggering: enrichMutation.isPending,
    triggerError: enrichMutation.error,
    
    // Combined states
    isActive: isEnrichmentTriggered && (statusQuery.isPolling || statusQuery.isLoading),
    showSpinner: statusQuery.isPolling || enrichMutation.isPending,
  };
}