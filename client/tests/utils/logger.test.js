import { describe, it, expect, vi } from 'vitest';
import { Logger, LOG_LEVELS } from '../../src/utils/logger.js';

describe('Logger', () => {
  it('creates with module name', () => {
    const log = new Logger('TestModule');
    expect(log.module).toBe('TestModule');
  });

  it('defaults to INFO level', () => {
    const log = new Logger('Test');
    expect(log.level).toBe(LOG_LEVELS.INFO);
  });

  it('accepts custom level', () => {
    const log = new Logger('Test', LOG_LEVELS.ERROR);
    expect(log.level).toBe(LOG_LEVELS.ERROR);
  });

  it('logs info when level is INFO', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = new Logger('Test', LOG_LEVELS.INFO);
    log.info('hello');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not log debug when level is INFO', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const log = new Logger('Test', LOG_LEVELS.INFO);
    log.debug('hello');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs debug when level is DEBUG', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const log = new Logger('Test', LOG_LEVELS.DEBUG);
    log.debug('hello');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs warn at WARN level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = new Logger('Test', LOG_LEVELS.WARN);
    log.warn('caution');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs error at ERROR level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = new Logger('Test', LOG_LEVELS.ERROR);
    log.error('fail');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('suppresses all logs at OFF level', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = new Logger('Test', LOG_LEVELS.OFF);
    log.info('hello');
    log.error('fail');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe('LOG_LEVELS', () => {
  it('has correct order', () => {
    expect(LOG_LEVELS.DEBUG).toBeLessThan(LOG_LEVELS.INFO);
    expect(LOG_LEVELS.INFO).toBeLessThan(LOG_LEVELS.WARN);
    expect(LOG_LEVELS.WARN).toBeLessThan(LOG_LEVELS.ERROR);
    expect(LOG_LEVELS.ERROR).toBeLessThan(LOG_LEVELS.OFF);
  });
});
