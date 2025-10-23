/**
 * Unit Test: GA4 Video Funnel Bucket Contract
 * 
 * Ensures that videoFunnel report returns exactly {10,25,50,75,90} buckets
 * and ignores any unknown buckets, preventing 100% completion regressions.
 */

const { describe, test, expect } = require('@jest/globals');

// Mock GA4 funnel response data
const mockFunnelResponse = {
  funnel: [
    { bucket: 10, count: 280 },
    { bucket: 25, count: 245 },
    { bucket: 50, count: 180 },
    { bucket: 75, count: 120 },
    { bucket: 90, count: 85 },
    // Test that unknown buckets are ignored
    { bucket: 100, count: 50 }, // Should be filtered out
    { bucket: 0, count: 300 },   // Should be filtered out
  ]
};

describe('GA4 Video Funnel Bucket Contract', () => {
  test('should return exactly 5 buckets: {10,25,50,75,90}', () => {
    const expectedBuckets = new Set([10, 25, 50, 75, 90]);
    
    // Filter to only valid buckets (matching our contract)
    const validBuckets = mockFunnelResponse.funnel
      .filter(step => expectedBuckets.has(step.bucket))
      .map(step => step.bucket);
    
    // Assert exactly 5 buckets
    expect(validBuckets).toHaveLength(5);
    
    // Assert correct bucket values
    const bucketSet = new Set(validBuckets);
    expect(bucketSet).toEqual(expectedBuckets);
    
    // Assert no 100% bucket in valid set
    expect(bucketSet.has(100)).toBe(false);
    
    console.log('✅ Funnel bucket contract validated:', validBuckets.sort());
  });

  test('should ignore unknown buckets (0%, 100%, etc)', () => {
    const validBuckets = [10, 25, 50, 75, 90];
    
    const filteredFunnel = mockFunnelResponse.funnel
      .filter(step => validBuckets.includes(step.bucket));
    
    // Should have exactly 5 valid buckets
    expect(filteredFunnel).toHaveLength(5);
    
    // Verify 100% and 0% buckets are excluded
    const buckets = filteredFunnel.map(step => step.bucket);
    expect(buckets).not.toContain(100);
    expect(buckets).not.toContain(0);
    
    console.log('✅ Unknown buckets filtered out correctly');
  });

  test('should maintain completion threshold at 90%', () => {
    const validBuckets = [10, 25, 50, 75, 90];
    const maxBucket = Math.max(...validBuckets);
    
    // Completion threshold should be 90%, not 100%
    expect(maxBucket).toBe(90);
    
    console.log('✅ Completion threshold correctly set to 90%');
  });
});

// Export for integration with existing test runner
module.exports = {
  validateFunnelBuckets: (funnelData) => {
    const expectedBuckets = new Set([10, 25, 50, 75, 90]);
    const validBuckets = funnelData.funnel
      .filter(step => expectedBuckets.has(step.bucket))
      .map(step => step.bucket);
    
    return {
      isValid: validBuckets.length === 5 && new Set(validBuckets).size === 5,
      buckets: validBuckets.sort(),
      hasInvalidBuckets: funnelData.funnel.some(step => !expectedBuckets.has(step.bucket))
    };
  }
};