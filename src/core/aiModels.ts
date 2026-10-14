// src/core/aiModels.ts

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  contextWindow?: string;
  recommended?: boolean;
}

export interface AIProviderConfig {
  id: 'gemini' | 'openai' | 'anthropic' | 'gateway';
  name: string;
  description: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyHelpUrl: string;
  keyHelpText: string;
  defaultModel: string;
  models: AIModelOption[];
  rateLimitNotice?: string;
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'High-speed reasoning with generous free-tier quotas and massive context windows.',
    keyLabel: 'Google Gemini API Key',
    keyPlaceholder: 'AIzaSy***********************************',
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
    keyHelpText: 'aistudio.google.com',
    defaultModel: 'gemini-2.5-flash',
    rateLimitNotice: 'Token bucket enforces 10 requests per minute and 250 requests per day to stay strictly within Google AI Studio free tier quotas.',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fastest reasoning & multimodal (Recommended)', contextWindow: '1M tokens', recommended: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning for complex code architectures', contextWindow: '2M tokens' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Lightweight, rapid response turnaround', contextWindow: '1M tokens' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Deep analytical and long-context capabilities', contextWindow: '2M tokens' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-gen experimental multimodal model', contextWindow: '1M tokens' },
      { id: 'custom', name: 'Custom Gemini Model...', description: 'Specify any Google model identifier (e.g. gemini-3.5-flash)' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry-standard models with specialized code synthesis and reasoning.',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-proj-***********************************',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    keyHelpText: 'platform.openai.com',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, highly cost-effective code synthesis (Recommended)', contextWindow: '128k tokens', recommended: true },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Flagship high-intelligence multimodal model', contextWindow: '128k tokens' },
      { id: 'o3-mini', name: 'o3-mini', description: 'High reasoning & math/coding specialist', contextWindow: '200k tokens' },
      { id: 'o1', name: 'o1', description: 'Deep deliberation chain-of-thought model', contextWindow: '200k tokens' },
      { id: 'custom', name: 'Custom OpenAI Model...', description: 'Specify any OpenAI model ID (e.g. gpt-4.5-preview)' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Leader in software engineering benchmarks and nuanced code refactoring.',
    keyLabel: 'Anthropic API Key',
    keyPlaceholder: 'sk-ant-api03-***********************************',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    keyHelpText: 'console.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'State-of-the-art coding and debugging benchmark leader', contextWindow: '200k tokens', recommended: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Ultra-fast, responsive code synthesizer', contextWindow: '200k tokens' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Deep analytical capability for complex logic', contextWindow: '200k tokens' },
      { id: 'custom', name: 'Custom Claude Model...', description: 'Specify any Anthropic model identifier' }
    ]
  },
  {
    id: 'gateway',
    name: 'Custom / AI Gateway',
    description: 'Route requests through Vercel AI Gateway or custom model endpoints.',
    keyLabel: 'AI Gateway / Custom API Key',
    keyPlaceholder: 'vck_***********************************',
    keyHelpUrl: 'https://vercel.com/docs/ai/ai-gateway',
    keyHelpText: 'vercel.com AI Gateway',
    defaultModel: 'google/gemini-2.5-flash',
    models: [
      { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', description: 'Routed via AI Gateway', recommended: true },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', description: 'Routed via AI Gateway' },
      { id: 'anthropic/claude-3-5-sonnet', name: 'Anthropic Claude 3.5 Sonnet', description: 'Routed via AI Gateway' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (V3)', description: 'Cost-effective reasoning model' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Open weights high performance' },
      { id: 'custom', name: 'Custom Model ID...', description: 'Specify any gateway model path (e.g. provider/model-name)' }
    ]
  }
];

export function getProviderConfig(providerId: string): AIProviderConfig {
  return AI_PROVIDERS.find(p => p.id === providerId) || AI_PROVIDERS[0];
}
