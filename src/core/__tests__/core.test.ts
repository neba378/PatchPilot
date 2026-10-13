// src/core/__tests__/core.test.ts
import { describe, it, expect } from 'vitest';
import { generateFingerprint, normalizeErrorMessage } from '../fingerprint';
import { triageIncident } from '../triage';
import { canTransition, assertTransition, InvalidStateTransitionError } from '../stateMachine';

describe('Fingerprint Normalization', () => {
  it('normalizes UUIDs, numbers, and hex values', () => {
    const raw = 'Error processing order 12345 for user 123e4567-e89b-12d3-a456-426614174000 at 0xdeadbeef';
    const normalized = normalizeErrorMessage(raw);
    expect(normalized).not.toContain('12345');
    expect(normalized).not.toContain('123e4567');
    expect(normalized).toContain('<num>');
    expect(normalized).toContain('<uuid>');
    expect(normalized).toContain('<hex>');
  });

  it('produces identical fingerprints for the same error pattern with different IDs', () => {
    const fp1 = generateFingerprint(
      'TypeError',
      'Cannot read properties of undefined for user 99182',
      [{ file: 'src/checkout.ts', function: 'processPayment', inApp: true }]
    );
    const fp2 = generateFingerprint(
      'TypeError',
      'Cannot read properties of undefined for user 88319',
      [{ file: 'src/checkout.ts', function: 'processPayment', inApp: true }]
    );
    expect(fp1).toEqual(fp2);
  });
});

describe('Rule-Based Triage', () => {
  it('classifies TypeError as code_bug and allows fix attempt', () => {
    const res = triageIncident({
      errorType: 'TypeError',
      errorMessage: "Cannot read property 'billing' of undefined",
      environment: 'production'
    });
    expect(res.category).toBe('code_bug');
    expect(res.shouldAttemptFix).toBe(true);
    expect(res.severity).toBe('critical');
  });

  it('classifies ECONNRESET as infrastructure and abstains', () => {
    const res = triageIncident({
      errorType: 'FetchError',
      errorMessage: 'read ECONNRESET from api.stripe.com:443',
      environment: 'production'
    });
    expect(res.category).toBe('infrastructure');
    expect(res.shouldAttemptFix).toBe(false);
    expect(res.abstainReason).toBeDefined();
  });

  it('classifies missing environment variable as config and abstains', () => {
    const res = triageIncident({
      errorMessage: 'Missing environment variable STRIPE_API_KEY',
      environment: 'production'
    });
    expect(res.category).toBe('config');
    expect(res.shouldAttemptFix).toBe(false);
  });
});

describe('State Machine', () => {
  it('allows legal transitions', () => {
    expect(canTransition('new', 'diagnosing')).toBe(true);
    expect(canTransition('diagnosing', 'awaiting_approval')).toBe(true);
    expect(canTransition('awaiting_approval', 'fixing')).toBe(true);
    expect(canTransition('fixing', 'validating')).toBe(true);
    expect(canTransition('validating', 'pr_open')).toBe(true);
    expect(canTransition('pr_open', 'merged')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('new', 'pr_open')).toBe(false);
    expect(canTransition('new', 'merged')).toBe(false);
    expect(() => assertTransition('new', 'pr_open')).toThrow(InvalidStateTransitionError);
  });
});
