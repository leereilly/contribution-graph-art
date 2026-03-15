import { Palette } from './types.js';

export const GITHUB_LIGHT: Palette = {
  name: 'github-light',
  colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

export const GITHUB_DARK: Palette = {
  name: 'github-dark',
  colors: ['#161b22', '#01311f', '#034525', '#0f6d31', '#00c647'],
};

export function getPalette(name: string): Palette {
  switch (name) {
    case 'github-light':
      return GITHUB_LIGHT;
    case 'github-dark':
      return GITHUB_DARK;
    default:
      return GITHUB_LIGHT;
  }
}
