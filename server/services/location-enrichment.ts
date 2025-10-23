import { HybridStorage } from '../hybrid-storage.js';
import { LocationService } from '../location-service.js';

export interface EnrichmentJobState {
  state: 'queued' | 'running' | 'success' | 'error' | 'degraded';
  progress: number;
  startedAt: number;
  ttl: number;
  jobId: string;
  totalIPs?: number;
  processedIPs?: number;
  error?: string;
}

export interface EnrichmentJobKey {
  dateFrom: string;
  dateTo: string;
  language?: string;
  includeProduction: boolean;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  openedAt: number;
  failureCount: number;
  openDurationMs: number;
}

/**
 * Singleton service for managing location enrichment jobs
 * Provides deduplication, circuit breaking, and status tracking
 */
export class EnrichmentManager {
  private static instance: EnrichmentManager;
  private storage: HybridStorage;
  private locationService: LocationService;
  private inFlight = new Map<string, EnrichmentJobState>();
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    openedAt: 0,
    failureCount: 0,
    openDurationMs: 5 * 60 * 1000 // 5 minutes
  };
  
  private readonly DEBOUNCE_MS = 60000; // 60 seconds
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_FAILURES = 3;
  private readonly CIRCUIT_OPEN_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CONCURRENCY_LIMIT = 2; // Max 2 IPs processed in parallel

  private constructor(storage: HybridStorage, locationService: LocationService) {
    this.storage = storage;
    this.locationService = locationService;
    
    // Cleanup expired jobs every minute
    setInterval(() => this.cleanupExpiredJobs(), 60000);
  }

  static getInstance(storage: HybridStorage, locationService: LocationService): EnrichmentManager {
    if (!EnrichmentManager.instance) {
      EnrichmentManager.instance = new EnrichmentManager(storage, locationService);
    }
    return EnrichmentManager.instance;
  }

  private generateJobKey(params: EnrichmentJobKey): string {
    return `${params.dateFrom}_${params.dateTo}_${params.language || 'all'}_${params.includeProduction}`;
  }

  private generateJobId(): string {
    return `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredJobs(): void {
    const now = Date.now();
    for (const [key, job] of Array.from(this.inFlight.entries())) {
      if (now > job.ttl) {
        console.log(`🧹 EnrichmentManager: Cleaning up expired job ${job.jobId}`);
        this.inFlight.delete(key);
      }
    }
  }

  private checkCircuitBreaker(): boolean {
    const now = Date.now();
    
    // If circuit is open, check if we should close it
    if (this.circuitBreaker.isOpen) {
      if (now - this.circuitBreaker.openedAt > this.circuitBreaker.openDurationMs) {
        console.log('🔄 EnrichmentManager: Circuit breaker closed - attempting recovery');
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
      } else {
        return false; // Circuit still open
      }
    }
    
    return true; // Circuit closed, proceed
  }

  private handleJobFailure(error: any): void {
    this.circuitBreaker.failureCount++;
    
    if (this.circuitBreaker.failureCount >= this.MAX_FAILURES) {
      console.log(`⚡ EnrichmentManager: Circuit breaker opened due to ${this.circuitBreaker.failureCount} failures`);
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.openedAt = Date.now();
    }
  }

  private async processEnrichmentJob(key: string, params: EnrichmentJobKey): Promise<void> {
    const job = this.inFlight.get(key);
    if (!job) return;

    try {
      console.log(`🚀 EnrichmentManager: Starting job ${job.jobId}`);
      
      // Get sessions
      const sessions = await this.storage.getAnalyticsSessions(
        params.dateFrom,
        params.dateTo,
        params.language,
        params.includeProduction
      );

      const uniqueIPs = Array.from(new Set(
        sessions.map(s => s.ip_address).filter(ip => ip && ip !== '0.0.0.0')
      ));

      console.log(`🌍 EnrichmentManager: Processing ${uniqueIPs.length} unique IPs`);

      // Update job with total count
      job.totalIPs = uniqueIPs.length;
      job.processedIPs = 0;

      // Process IPs in small chunks with concurrency limit
      for (let i = 0; i < uniqueIPs.length; i += this.CONCURRENCY_LIMIT) {
        const batch = uniqueIPs.slice(i, i + this.CONCURRENCY_LIMIT);
        
        await Promise.all(batch.map(async (ip, index) => {
          try {
            // Add small delay within batch
            await new Promise(resolve => setTimeout(resolve, index * 1000));
            
            const locationData = await this.locationService.getLocationData(ip);
            if (locationData) {
              await this.storage.updateSessionLocation(ip, {
                country: locationData.country,
                region: locationData.region,
                city: locationData.city
              });
            }
            
            // Update progress
            if (job.processedIPs !== undefined) {
              job.processedIPs++;
              job.progress = Math.round((job.processedIPs / job.totalIPs!) * 100);
            }
          } catch (error) {
            console.error(`⚠️ EnrichmentManager: Error processing IP ${ip}:`, error);
          }
        }));

        // Small delay between batches
        if (i + this.CONCURRENCY_LIMIT < uniqueIPs.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Mark job as successful
      job.state = 'success';
      job.progress = 100;
      console.log(`✅ EnrichmentManager: Job ${job.jobId} completed successfully`);

    } catch (error) {
      console.error(`❌ EnrichmentManager: Job ${job.jobId} failed:`, error);
      job.state = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.handleJobFailure(error);
    }
  }

  async startEnrichment(params: EnrichmentJobKey): Promise<EnrichmentJobState> {
    const key = this.generateJobKey(params);
    const now = Date.now();

    // Check circuit breaker
    if (!this.checkCircuitBreaker()) {
      return {
        state: 'degraded',
        progress: 0,
        startedAt: now,
        ttl: now + this.TTL_MS,
        jobId: 'circuit_open',
        error: 'Service temporarily unavailable due to repeated failures'
      };
    }

    // Check if job already exists and is recent
    const existingJob = this.inFlight.get(key);
    if (existingJob) {
      const timeSinceStart = now - existingJob.startedAt;
      
      // If job is recent (within debounce window) and not failed, return existing job
      if (timeSinceStart < this.DEBOUNCE_MS && existingJob.state !== 'error') {
        console.log(`🔄 EnrichmentManager: Returning existing job ${existingJob.jobId} (${timeSinceStart}ms old)`);
        return existingJob;
      }
      
      // If job is old or failed, we can start a new one
      if (existingJob.state === 'running') {
        console.log(`⏳ EnrichmentManager: Job still running, returning status for ${existingJob.jobId}`);
        return existingJob;
      }
    }

    // Create new job
    const jobId = this.generateJobId();
    const newJob: EnrichmentJobState = {
      state: 'queued',
      progress: 0,
      startedAt: now,
      ttl: now + this.TTL_MS,
      jobId
    };

    this.inFlight.set(key, newJob);
    console.log(`🎯 EnrichmentManager: Created job ${jobId} for key ${key}`);

    // Start processing asynchronously
    setImmediate(() => {
      newJob.state = 'running';
      this.processEnrichmentJob(key, params);
    });

    return newJob;
  }

  getJobStatus(params: EnrichmentJobKey): EnrichmentJobState | null {
    const key = this.generateJobKey(params);
    return this.inFlight.get(key) || null;
  }

  getStats() {
    return {
      activeJobs: this.inFlight.size,
      circuitBreakerOpen: this.circuitBreaker.isOpen,
      circuitBreakerFailures: this.circuitBreaker.failureCount,
      jobs: Array.from(this.inFlight.entries()).map(([key, job]) => ({
        key,
        jobId: job.jobId,
        state: job.state,
        progress: job.progress,
        ageMs: Date.now() - job.startedAt
      }))
    };
  }
}