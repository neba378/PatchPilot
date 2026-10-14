import fs from 'fs';
import path from 'path';

const logFilePath = process.env.DEBUG_LOG_PATH || path.join(process.cwd(), 'logs', 'debug-trace.log');

try {
  const dir = path.dirname(logFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch {}

function formatLog(level: string, arg1: any, arg2?: any) {
  const timestamp = new Date().toISOString();
  let meta: any = {};
  let msg = '';

  if (typeof arg1 === 'string') {
    msg = arg1;
    meta = arg2 || {};
  } else if (typeof arg2 === 'string') {
    msg = arg2;
    meta = arg1 || {};
  } else {
    meta = arg1 || {};
    msg = meta.message || '';
  }

  // Format meta if present
  let metaStr = '';
  if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
    try {
      metaStr = ` ${JSON.stringify(meta)}`;
    } catch {
      metaStr = ' [Circular / Unserializable Meta]';
    }
  }

  const line = `[${timestamp}] [${level.toUpperCase()}] ${msg}${metaStr}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  try {
    fs.appendFileSync(logFilePath, line + '\n', 'utf-8');
  } catch {}
}

export const logger = {
  info: (arg1: any, arg2?: any) => formatLog('info', arg1, arg2),
  warn: (arg1: any, arg2?: any) => formatLog('warn', arg1, arg2),
  error: (arg1: any, arg2?: any) => formatLog('error', arg1, arg2),
  debug: (arg1: any, arg2?: any) => formatLog('debug', arg1, arg2),
};

