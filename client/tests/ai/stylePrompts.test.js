import { describe, it, expect } from 'vitest';
import { STYLE_PROMPTS } from '../../src/ai/stylePrompts.js';

describe('stylePrompts', () => {
  it('has watercolor prompt', () => {
    expect(STYLE_PROMPTS.watercolor).toBeDefined();
    expect(STYLE_PROMPTS.watercolor).toContain('watercolor');
  });

  it('has bollywood prompt', () => {
    expect(STYLE_PROMPTS.bollywood).toBeDefined();
    expect(STYLE_PROMPTS.bollywood).toContain('Bollywood');
  });

  it('has rangoli prompt', () => {
    expect(STYLE_PROMPTS.rangoli).toBeDefined();
    expect(STYLE_PROMPTS.rangoli).toContain('rangoli');
  });

  it('all prompts are non-empty strings', () => {
    for (const [key, value] of Object.entries(STYLE_PROMPTS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(50);
    }
  });

  it('has exactly 3 styles', () => {
    expect(Object.keys(STYLE_PROMPTS)).toHaveLength(3);
  });
});
