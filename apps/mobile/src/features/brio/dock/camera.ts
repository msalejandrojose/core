/** ¿Se puede abrir la cámara dentro de la app? (iOS/Android y webs seguras). */
export const canUseInlineCamera = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

