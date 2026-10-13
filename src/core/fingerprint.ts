// src/core/fingerprint.ts
import crypto from 'crypto';
import { StackFrameSchema } from './schemas';
import { z } from 'zod';

type StackFrame = z.infer<typeof StackFrameSchema>;

/**
 * Normalizes an error message by stripping volatile details:
 * - UUIDs
 * - Hex strings / memory addresses (0x...)
 * - Numbers / timestamps
 * - Quoted strings
 */
export function normalizeErrorMessage(msg: string): string {
  if (!msg) return '';

  return msg
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    // Replace hex hashes & addresses
    .replace(/0x[0-9a-fA-F]+/g, '<HEX>')
    .replace(/[0-9a-fA-F]{16,64}/g, '<HASH>')
    // Replace quoted strings
    .replace(/["'`][^"'`]*["'`]/g, '<STR>')
    // Replace numbers
    .replace(/\b\d+\b/g, '<NUM>')
    // Strip redundant whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Generates an idempotent incident fingerprint:
 * sha256 of errorType + normalizedErrorMessage + topInAppFrame (file + function)
 */
export function generateFingerprint(
  errorType: string | undefined | null,
  errorMessage: string | undefined | null,
  stackFrames: StackFrame[] = []
): string {
  const normType = (errorType || 'unknown_error').toLowerCase().trim();
  const normMsg = normalizeErrorMessage(errorMessage || '');

  const topInAppFrame = stackFrames.find(f => f.inApp) || stackFrames[0];
  const frameSignature = topInAppFrame
    ? `${topInAppFrame.file}:${topInAppFrame.function || 'anonymous'}`
    : 'no_frame';

  const rawSeed = `${normType}|${normMsg}|${frameSignature}`;
  return crypto.createHash('sha256').update(rawSeed).digest('hex');
}
