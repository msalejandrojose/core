import { Capacitor } from '@capacitor/core';

/** Una escucha en marcha: `stop` devuelve lo entendido; `cancel` lo descarta. */
export interface SpeechSession {
  stop: () => Promise<string>;
  cancel: () => void;
}

type WebRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const webCtor = (): (new () => WebRecognition) | undefined => {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => WebRecognition) | undefined;
};

/**
 * ¿Hay permiso para dictar? En iOS/Android, sin preguntar todavía. En la web lo
 * decide el navegador al empezar, así que se da por bueno.
 */
export async function speechPermission(): Promise<'granted' | 'prompt' | 'denied'> {
  if (!Capacitor.isNativePlatform()) return 'granted';
  const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
  const { speechRecognition } = await SpeechRecognition.checkPermissions();
  return speechRecognition === 'granted' ? 'granted' : speechRecognition === 'denied' ? 'denied' : 'prompt';
}

/** Pide micro y voz (iOS enseña sus dos avisos). Se llama sin estar escuchando. */
export async function requestSpeechPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
  const { speechRecognition } = await SpeechRecognition.requestPermissions();
  return speechRecognition === 'granted';
}

/**
 * Dictado en español. En iOS/Android usa el reconocedor del sistema (plugin
 * `@capacitor-community/speech-recognition`, que pide micro y voz); en la web,
 * la Web Speech API si el navegador la tiene. Lanza `SPEECH_UNAVAILABLE` o
 * `SPEECH_DENIED` si no se puede.
 */
export async function startSpeech(onText: (text: string) => void): Promise<SpeechSession> {
  if (Capacitor.isNativePlatform()) {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
    const { available } = await SpeechRecognition.available();
    if (!available) throw new Error('SPEECH_UNAVAILABLE');
    // Los permisos se piden antes (requestSpeechPermission): si iOS enseña sus
    // avisos a mitad de pulsación, se traga el «soltar» y la burbuja se queda.
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') throw new Error('SPEECH_NEEDS_PERMISSION');
    let last = '';
    const sub = await SpeechRecognition.addListener('partialResults', (d: { matches?: string[] }) => {
      last = d.matches?.[0] ?? last;
      onText(last);
    });
    try {
      // Con resultados parciales, `start` resuelve en cuanto empieza a escuchar.
      await SpeechRecognition.start({ language: 'es-ES', partialResults: true, popup: false, maxResults: 1 });
    } catch {
      await sub.remove();
      throw new Error('SPEECH_UNAVAILABLE');
    }
    const end = async () => {
      await SpeechRecognition.stop().catch(() => undefined);
      await sub.remove();
    };
    return {
      stop: async () => {
        // El último resultado parcial llega justo al parar.
        await new Promise((r) => setTimeout(r, 250));
        await end();
        return last.trim();
      },
      cancel: () => void end(),
    };
  }

  const Ctor = webCtor();
  if (!Ctor) throw new Error('SPEECH_UNAVAILABLE');
  const rec = new Ctor();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.continuous = true;
  let text = '';
  let ended: () => void = () => undefined;
  const done = new Promise<void>((r) => (ended = r));
  rec.onresult = (e) => {
    text = Array.from(e.results, (r) => r[0]?.transcript ?? '').join(' ');
    onText(text);
  };
  rec.onend = () => ended();
  rec.onerror = () => ended();
  rec.start();
  return {
    stop: async () => {
      rec.stop();
      await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]);
      return text.trim();
    },
    cancel: () => rec.abort(),
  };
}
