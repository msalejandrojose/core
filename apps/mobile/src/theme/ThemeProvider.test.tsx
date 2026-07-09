import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { useThemeStore } from '@/store/theme.store';

// StatusBar es nativo; en jsdom lo stubbeamos para que no lance.
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: () => Promise.resolve() },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));

afterEach(() => {
  useThemeStore.setState({ theme: 'system' });
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('fuerza data-theme=dark cuando el tema es oscuro', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<ThemeProvider>ok</ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('fuerza data-theme=light cuando el tema es claro', () => {
    useThemeStore.setState({ theme: 'light' });
    render(<ThemeProvider>ok</ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('no pone atributo cuando el tema es system (manda el sistema)', () => {
    useThemeStore.setState({ theme: 'system' });
    render(<ThemeProvider>ok</ThemeProvider>);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
