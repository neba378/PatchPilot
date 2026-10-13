// src/policy/scrubber.ts

const SECRET_PATTERNS = [
  // GitHub Personal Access Tokens and Fine-Grained Tokens
  /ghp_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /ghu_[a-zA-Z0-9]{36}/g,

  // AWS Access Key and Secret Key
  /AKIA[0-9A-Z]{16}/g,
  /(?:aws_secret_access_key|aws_session_token)\s*=\s*['"]?[a-zA-Z0-9/+=]{40}['"]?/gi,

  // Slack tokens
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g,

  // Google API keys
  /AIza[0-9A-Za-z-_]{35}/g,

  // Generic Bearer Tokens & JWTs
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,

  // Private Keys
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,

  // Password / Secret in query strings or config lines
  /(?:password|passwd|secret|api_key|apikey|token)\s*[:=]\s*['"]?[^\s"',;&]{4,}['"]?/gi
];

/**
 * Scrubs and masks credentials from logs, stack traces, and code diffs before LLM ingestion.
 */
export function scrubSecrets(input: string | null | undefined): string {
  if (!input) return '';

  let sanitized = input;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.startsWith('-----BEGIN')) {
        return '[REDACTED_PRIVATE_KEY]';
      }
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED_TOKEN]';
      }
      return '[REDACTED_SECRET]';
    });
  }

  return sanitized;
}
