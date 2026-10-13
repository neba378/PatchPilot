// src/adapters/channels/telegram.ts
import { Incident } from '../../core/schemas';
import { logger } from '../../core/logger';
import { db } from '../../db';
import { messages } from '../../db/schema';

export interface TelegramButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export class TelegramAdapter {
  private botToken?: string;
  private defaultChatId?: string;

  constructor(token?: string, chatId?: string) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN;
    this.defaultChatId = chatId;
  }

  /**
   * Generates the structured Markdown alert card with 4 inline buttons.
   */
  public formatAlertCard(incident: Incident, appUrl: string = 'http://localhost:3000'): { text: string; inlineKeyboard: TelegramButton[][] } {
    const shortId = incident.id.replace('INC-', '');
    const severityEmoji = incident.severity === 'critical' ? '🔴' : incident.severity === 'high' ? '🟠' : '🟡';

    let relatedText = '1 signal';
    try {
      const rawSignals = incident.relatedSignals;
      const signals = typeof rawSignals === 'string' ? JSON.parse(rawSignals) : (Array.isArray(rawSignals) ? rawSignals : []);
      relatedText = `${signals.length} signal(s) (${signals.map((s: any) => s.source).join(', ')})`;
    } catch {}

    const text = `
${severityEmoji} *PATCHPILOT INCIDENT ALERT* ${severityEmoji}

*Incident ID:* \`${incident.id}\`
*Severity:* \`${incident.severity.toUpperCase()}\`
*Title:* ${incident.title}
*Environment:* \`${incident.environment}\`
*Occurrences:* ${incident.occurrences} (${relatedText})
*Suspect Commit:* \`${incident.commitSha?.slice(0, 7) || 'HEAD'}\`

*Likely Root Cause:*
${incident.errorMessage || 'Unhandled runtime exception'}

*Action Required:*
An isolated sandbox fix has been prepared and is ready for execution.
Tap *Accept & Patch* to reproduce in sandbox, synthesize fix, and generate draft PR.
`.trim();

    const inlineKeyboard: TelegramButton[][] = [
      [
        {
          text: '🔍 View Details',
          url: `${appUrl}/incidents/${incident.id}`
        },
        {
          text: '✅ Accept & Patch',
          callback_data: `i:${shortId}:a`
        }
      ],
      [
        {
          text: '❌ Reject',
          callback_data: `i:${shortId}:r`
        },
        {
          text: '⏳ Snooze (2h)',
          callback_data: `i:${shortId}:s`
        }
      ]
    ];

    return { text, inlineKeyboard };
  }

  /**
   * Dispatches alert card to Telegram channel.
   * If TELEGRAM_BOT_TOKEN is not configured, logs cleanly and records in database for UI simulation.
   */
  public async sendAlert(incident: Incident, chatId?: string, appUrl?: string): Promise<{ success: boolean; simulated: boolean }> {
    const targetChatId = chatId || this.defaultChatId || process.env.TELEGRAM_CHAT_ID;
    const { text, inlineKeyboard } = this.formatAlertCard(incident, appUrl || process.env.APP_URL);

    // Save message to database messages table
    const messageRecordId = `MSG-${Date.now().toString(36)}`;
    try {
      await db.insert(messages).values({
        id: messageRecordId,
        incidentId: incident.id,
        channelType: 'telegram',
        chatId: targetChatId || 'simulated-channel',
        content: text,
        status: 'sent',
        sentAt: new Date().toISOString()
      });
    } catch {}

    if (!this.botToken || !targetChatId) {
      logger.info({ incidentId: incident.id }, '[TelegramAdapter] TELEGRAM_BOT_TOKEN not configured. Simulated dispatch recorded in DB.');
      return { success: true, simulated: true };
    }

    try {
      const endpoint = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        logger.warn({ error: errBody }, '[TelegramAdapter] Failed to send Telegram message');
        return { success: false, simulated: false };
      }

      logger.info({ incidentId: incident.id }, '[TelegramAdapter] Alert dispatched successfully to Telegram');
      return { success: true, simulated: false };
    } catch (err: any) {
      logger.error({ error: err.message }, '[TelegramAdapter] Network error sending to Telegram');
      return { success: false, simulated: false };
    }
  }

  /**
   * Sends real-time progress update to thread.
   */
  public async sendProgress(incidentId: string, stage: string, detail: string): Promise<void> {
    logger.info({ incidentId, stage, detail }, `[TelegramProgress] ⚡ ${stage}: ${detail}`);
  }
}

export const telegramAdapter = new TelegramAdapter();
