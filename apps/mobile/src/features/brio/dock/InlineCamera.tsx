import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { MAX_SIDE, fitSize, photoToDataUrl } from '../coach/photos';

/**
 * Cámara dentro de la app, como en los chats con IA: visor grande con el botón
 * de disparar, «‹» para cerrar y «⋯» para elegir una foto de la galería.
 * Devuelve la foto reducida (JPEG en data URL).
 */
export function InlineCamera({ onShot, onClose }: { onShot: (dataUrl: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (!alive) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => undefined);
        }
      })
      .catch(() => setError(true));
    return () => {
      alive = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const { width, height } = fitSize(v.videoWidth, v.videoHeight, MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(v, 0, 0, width, height);
    onShot(canvas.toDataURL('image/jpeg', 0.8));
  };

  const pick = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const url = await photoToDataUrl(f).catch(() => null);
    if (url) onShot(url);
  };

  return (
    <div className="dock-camera" role="dialog" aria-label="Cámara">
      {error ? (
        <p className="dock-camera__error">No se puede abrir la cámara. Dale permiso en Ajustes › Brío o elige una foto.</p>
      ) : (
        <video ref={video} className="dock-camera__video" playsInline muted autoPlay />
      )}
      <div className="dock-camera__bar">
        <button type="button" className="dock-camera__round" aria-label="Cerrar la cámara" onClick={onClose}>
          <Icon d={PATHS.back} size={22} stroke={2.4} />
        </button>
        <button type="button" className="dock-camera__shutter" aria-label="Hacer la foto" disabled={error} onClick={shoot}>
          <span />
        </button>
        <button type="button" className="dock-camera__round" aria-label="Elegir de la galería" onClick={() => gallery.current?.click()}>
          <Icon d={PATHS.more} size={22} stroke={2.4} />
        </button>
      </div>
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files)} />
    </div>
  );
}
