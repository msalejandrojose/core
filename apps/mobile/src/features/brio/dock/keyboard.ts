import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Teclado de iOS/Android: quita la barra ^ ˅ ✓ que iOS pone encima y marca
 * `body.kb-open` mientras está abierto, para que el campo del coach se pegue al
 * teclado (sin el margen del indicador de inicio, que con teclado sobra).
 */
export function useKeyboardLayout() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    let alive = true;
    void import('@capacitor/keyboard').then(async ({ Keyboard }) => {
      if (Capacitor.getPlatform() === 'ios') {
        await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => undefined);
      }
      const show = await Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('kb-open'));
      const hide = await Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('kb-open'));
      cleanup = () => {
        void show.remove();
        void hide.remove();
      };
      if (!alive) cleanup();
    });
    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);
}
