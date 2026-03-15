import { describe, it, expect } from 'vitest';
import { getPalette, GITHUB_LIGHT, GITHUB_DARK } from '../src/palettes.js';

describe('getPalette', () => {
  it('returns github-light for "github-light"', () => {
    const palette = getPalette('github-light');
    expect(palette).toBe(GITHUB_LIGHT);
    expect(palette.name).toBe('github-light');
  });

  it('returns github-dark for "github-dark"', () => {
    const palette = getPalette('github-dark');
    expect(palette).toBe(GITHUB_DARK);
    expect(palette.name).toBe('github-dark');
  });

  it('returns github-light for unknown names', () => {
    const palette = getPalette('unknown-palette');
    expect(palette).toBe(GITHUB_LIGHT);
  });

  it('returns github-light for empty string', () => {
    const palette = getPalette('');
    expect(palette).toBe(GITHUB_LIGHT);
  });
});

describe('palette structure', () => {
  const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

  it('each palette has exactly 5 colors', () => {
    expect(GITHUB_LIGHT.colors).toHaveLength(5);
    expect(GITHUB_DARK.colors).toHaveLength(5);
  });

  it('GITHUB_LIGHT colors are valid hex strings', () => {
    for (const color of GITHUB_LIGHT.colors) {
      expect(color).toMatch(HEX_REGEX);
    }
  });

  it('GITHUB_DARK colors are valid hex strings', () => {
    for (const color of GITHUB_DARK.colors) {
      expect(color).toMatch(HEX_REGEX);
    }
  });

  it('getPalette result always has 5 valid hex colors', () => {
    for (const name of ['github-light', 'github-dark', 'nonexistent']) {
      const palette = getPalette(name);
      expect(palette.colors).toHaveLength(5);
      for (const color of palette.colors) {
        expect(color).toMatch(HEX_REGEX);
      }
    }
  });
});
