// src/agents/rateLimiter.ts
import { logger } from '../core/logger';

export class GeminiRateLimiter {
  private rpmLimit: number;
  private rpdLimit: number;
  private minuteTokens: number;
  private dayTokens: number;
  private lastMinuteReset: number;
  private lastDayReset: number;

  constructor(rpm: number = 10, rpd: number = 250) {
    this.rpmLimit = rpm;
    this.rpdLimit = rpd;
    this.minuteTokens = rpm;
    this.dayTokens = rpd;
    this.lastMinuteReset = Date.now();
    this.lastDayReset = Date.now();
  }

  private refill(): void {
    const now = Date.now();

    // Reset minute bucket
    if (now - this.lastMinuteReset >= 60000) {
      this.minuteTokens = this.rpmLimit;
      this.lastMinuteReset = now;
    }

    // Reset day bucket (24 hours)
    if (now - this.lastDayReset >= 86400000) {
      this.dayTokens = this.rpdLimit;
      this.lastDayReset = now;
    }
  }

  public async acquire(): Promise<boolean> {
    this.refill();

    if (this.dayTokens <= 0) {
      logger.warn('[RateLimiter] Daily limit exhausted (250 RPD)');
      return false;
    }

    if (this.minuteTokens <= 0) {
      const waitMs = 60000 - (Date.now() - this.lastMinuteReset) + 500;
      logger.info({ waitMs }, '[RateLimiter] Minute bucket full. Backing off...');
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.refill();
    }

    this.minuteTokens--;
    this.dayTokens--;
    return true;
  }

  public getStatus() {
    this.refill();
    return {
      minuteTokensRemaining: this.minuteTokens,
      dayTokensRemaining: this.dayTokens,
      rpmLimit: this.rpmLimit,
      rpdLimit: this.rpdLimit
    };
  }
}

export const geminiRateLimiter = new GeminiRateLimiter(
  Number(process.env.GEMINI_RPM) || 10,
  Number(process.env.GEMINI_RPD) || 250
);
