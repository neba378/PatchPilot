// src/core/logger.ts

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

  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${msg}${metaStr}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (arg1: any, arg2?: any) => formatLog('info', arg1, arg2),
  warn: (arg1: any, arg2?: any) => formatLog('warn', arg1, arg2),
  error: (arg1: any, arg2?: any) => formatLog('error', arg1, arg2),
  debug: (arg1: any, arg2?: any) => formatLog('debug', arg1, arg2),
};
