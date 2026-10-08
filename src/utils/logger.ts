type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): Level {
  const raw = (process.env['LOG_LEVEL'] ?? 'info').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return 'info';
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (order[level] < order[currentLevel()]) return;
  // Never log secrets: callers must not pass tokens/message content here.
  // See docs/security.md.
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>): void => {
    emit('debug', msg, fields);
  },
  info: (msg: string, fields?: Record<string, unknown>): void => {
    emit('info', msg, fields);
  },
  warn: (msg: string, fields?: Record<string, unknown>): void => {
    emit('warn', msg, fields);
  },
  error: (fieldsOrMsg: Record<string, unknown> | string, msg?: string): void => {
    // Support both logger.error('msg') and logger.error({...}, 'msg')
    if (typeof fieldsOrMsg === 'string') emit('error', fieldsOrMsg);
    else emit('error', msg ?? 'error', fieldsOrMsg);
  },
};
