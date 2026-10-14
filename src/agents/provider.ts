// src/agents/provider.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGateway } from '@ai-sdk/gateway';
import { createProviderRegistry, LanguageModel } from 'ai';
import { logger } from '../core/logger';
import { db } from '../db';
import { connections } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import dns from 'dns';

// Ensure IPv4 first to avoid Node.js IPv6 DNS resolution timeouts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export type SupportedProvider = 'gemini' | 'openai' | 'anthropic' | 'gateway';

export interface ModelResolutionOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
  projectId?: string;
}

export interface ResolvedModel {
  model: LanguageModel;
  provider: SupportedProvider;
  modelName: string;
}

/**
 * Returns available provider list and defaults.
 */
export function getSupportedProviders() {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini',
      defaultModel: 'gemini-flash-latest',
      recommendedModels: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-pro']
    },
    {
      id: 'openai',
      name: 'OpenAI',
      defaultModel: 'gpt-4o-mini',
      recommendedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini']
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      defaultModel: 'claude-3-5-sonnet-20241022',
      recommendedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    },
    {
      id: 'gateway',
      name: 'Vercel AI Gateway',
      defaultModel: 'google/gemini-2.5-flash',
      recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3-5-sonnet']
    }
  ];
}

/**
 * Resolves the language model using Vercel AI SDK abstraction based on
 * project database settings, explicit parameters, or environment variables.
 */
export async function getLanguageModel(options: ModelResolutionOptions = {}): Promise<ResolvedModel> {
  let providerStr = options.provider || process.env.AI_PROVIDER || '';
  let modelStr = options.model || process.env.AI_MODEL || '';
  let keyStr = options.apiKey || process.env.AI_API_KEY || '';

  // 1. Check project connections table if projectId provided
  if (options.projectId) {
    try {
      const projectConns = await db.select().from(connections)
        .where(eq(connections.projectId, options.projectId));
      
      const aiConn = projectConns.find(c => ['gemini', 'openai', 'anthropic', 'ai'].includes(c.type));
      if (aiConn) {
        if (!providerStr) providerStr = aiConn.type === 'ai' ? 'gateway' : aiConn.type;
        if (!keyStr) keyStr = aiConn.encryptedSecret || '';
        if (!modelStr && aiConn.metadata) {
          try {
            const meta = JSON.parse(aiConn.metadata);
            if (meta.model) modelStr = meta.model;
          } catch {}
        }
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[AIProvider] Failed to lookup project AI connection from DB');
    }
  }

  // 2. Infer provider if not specified
  if (!providerStr) {
    if (modelStr.startsWith('gpt-') || modelStr.startsWith('o1-') || modelStr.startsWith('o3-')) {
      providerStr = 'openai';
    } else if (modelStr.startsWith('claude-')) {
      providerStr = 'anthropic';
    } else if (modelStr.includes('/')) {
      providerStr = 'gateway';
    } else if (process.env.OPENAI_API_KEY) {
      providerStr = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      providerStr = 'anthropic';
    } else if (process.env.AI_GATEWAY_API_KEY) {
      providerStr = 'gateway';
    } else {
      providerStr = 'gemini';
    }
  }

  const normalizedProvider = providerStr.toLowerCase() as SupportedProvider;

  // 3. Resolve API Key & Default Model per provider
  switch (normalizedProvider) {
    case 'openai': {
      const apiKey = keyStr || process.env.OPENAI_API_KEY || '';
      const modelName = modelStr || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env or configure in project settings.');
      }
      logger.info({ provider: 'openai', model: modelName }, '[AIProvider] Initializing OpenAI via AI SDK');
      const openai = createOpenAI({ apiKey });
      return { model: openai(modelName), provider: 'openai', modelName };
    }

    case 'anthropic': {
      const apiKey = keyStr || process.env.ANTHROPIC_API_KEY || '';
      const modelName = modelStr || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
      if (!apiKey) {
        throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY in .env or configure in project settings.');
      }
      logger.info({ provider: 'anthropic', model: modelName }, '[AIProvider] Initializing Anthropic via AI SDK');
      const anthropic = createAnthropic({ apiKey });
      return { model: anthropic(modelName), provider: 'anthropic', modelName };
    }

    case 'gateway': {
      const apiKey = keyStr || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_KEY || '';
      const modelName = modelStr || 'google/gemini-2.5-flash';
      logger.info({ provider: 'gateway', model: modelName }, '[AIProvider] Initializing Vercel AI Gateway via AI SDK');
      const gateway = createGateway({ apiKey });
      return { model: gateway(modelName), provider: 'gateway', modelName };
    }

    case 'gemini':
    default: {
      const apiKey = keyStr || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
      const modelName = modelStr || process.env.GEMINI_MODEL || 'gemini-flash-latest';
      if (!apiKey) {
        throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in .env or configure in project settings.');
      }
      logger.info({ provider: 'gemini', model: modelName }, '[AIProvider] Initializing Google Gemini via AI SDK');
      const google = createGoogleGenerativeAI({ apiKey });
      return { model: google(modelName), provider: 'gemini', modelName };
    }
  }
}
