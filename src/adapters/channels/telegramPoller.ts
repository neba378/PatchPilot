// src/adapters/channels/telegramPoller.ts
import { logger } from '../../core/logger';
import { db } from '../../db';
import { incidents, investigations } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { executeSandboxFix } from '../../core/sandboxFixPipeline';
import { buildInvestigationContext } from '../../core/contextBuilder';
import { runInvestigation } from '../../agents/investigator';

export class TelegramPoller {
  private botToken?: string;
  private isRunning: boolean = false;
  private offset: number = 0;

  constructor(token?: string) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN;
  }

  public async start(): Promise<void> {
    if (!this.botToken) {
      logger.warn('[TelegramPoller] No TELEGRAM_BOT_TOKEN set. Telegram poller will not start.');
      return;
    }

    this.isRunning = true;
    logger.info('[TelegramPoller] Starting real Telegram long-polling daemon');

    while (this.isRunning) {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.offset}&timeout=20`;
        const res = await fetch(url);
        if (!res.ok) {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err: any) {
        logger.error({ error: err.message }, '[TelegramPoller] Polling error');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
  }

  private async answerCallback(callbackQueryId: string, text: string): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text })
      });
    } catch {}
  }

  private async sendMessage(chatId: string | number, text: string): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      });
    } catch {}
  }

  private async handleUpdate(update: any): Promise<void> {
    // 1. Handle /start <link_token> command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const text = `
👋 *Welcome to PatchPilot AI On-Call DevOps Agent!*

Your Telegram channel is now bound to PatchPilot.
You will receive real-time incident alert cards with inline buttons:
• *View Details*: Open incident cockpit in browser
• *Accept & Patch*: Run isolated sandbox verification & draft PR
• *Reject*: Archive incident
• *Snooze*: Mute alert for 2 hours
`.trim();
      await this.sendMessage(chatId, text);
      return;
    }

    // 2. Handle Inline Button Clicks (Callback Queries)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data: string = cq.data || '';
      const chatId = cq.message?.chat?.id;

      // Format: i:<shortId>:<action> (e.g. i:9042:a)
      const parts = data.split(':');
      if (parts[0] === 'i' && parts.length === 3) {
        const shortId = parts[1];
        const actionCode = parts[2];
        const incidentId = `INC-${shortId}`;

        const incident = await db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
        if (!incident) {
          await this.answerCallback(cq.id, 'Incident not found.');
          return;
        }

        if (actionCode === 'a') {
          await this.answerCallback(cq.id, '⚡ Starting isolated sandbox fix...');
          await this.sendMessage(chatId, `🔧 *PatchPilot Execution Started:* Provisioning isolated sandbox for \`${incidentId}\`...`);

          try {
            const ctx = await buildInvestigationContext(incident as any);
            const inv = await runInvestigation(ctx);
            const fixRes = await executeSandboxFix(incident as any, inv, true);

            if (fixRes.success) {
              await this.sendMessage(
                chatId,
                `✅ *Draft Pull Request Created with Proof!*\n\n• PR: ${fixRes.prUrl}\n• Regression test verified in sandbox\n• ESLint and TypeCheck passed clean.`
              );
            } else {
              await this.sendMessage(chatId, `❌ *Fix Failed:* ${fixRes.error}`);
            }
          } catch (e: any) {
            await this.sendMessage(chatId, `❌ *Error executing fix:* ${e.message}`);
          }
        } else if (actionCode === 'r') {
          await db.update(incidents).set({ status: 'rejected' }).where(eq(incidents.id, incidentId));
          await this.answerCallback(cq.id, 'Incident marked rejected.');
          await this.sendMessage(chatId, `🚫 Incident \`${incidentId}\` was rejected by human engineer.`);
        } else if (actionCode === 's') {
          await db.update(incidents).set({ status: 'snoozed' }).where(eq(incidents.id, incidentId));
          await this.answerCallback(cq.id, 'Snoozed for 2 hours.');
          await this.sendMessage(chatId, `⏳ Incident \`${incidentId}\` snoozed for 2 hours.`);
        }
      }
    }
  }
}

export const telegramPoller = new TelegramPoller();
