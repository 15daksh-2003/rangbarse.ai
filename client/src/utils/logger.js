const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, OFF: 4 };

const isDebug = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('debug');

export class Logger {
  constructor(module, level) {
    this.module = module;
    this.level = level ?? (isDebug ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);
  }

  debug(msg, ...args) {
    if (this.level <= LOG_LEVELS.DEBUG)
      console.debug(`%c[${this.module}]`, 'color:#888', msg, ...args);
  }

  info(msg, ...args) {
    if (this.level <= LOG_LEVELS.INFO)
      console.info(`%c[${this.module}]`, 'color:#4FC3F7', msg, ...args);
  }

  warn(msg, ...args) {
    if (this.level <= LOG_LEVELS.WARN)
      console.warn(`[${this.module}]`, msg, ...args);
  }

  error(msg, ...args) {
    if (this.level <= LOG_LEVELS.ERROR)
      console.error(`[${this.module}]`, msg, ...args);
  }
}

export { LOG_LEVELS };
