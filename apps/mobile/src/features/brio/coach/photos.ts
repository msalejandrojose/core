/** Fotos para el coach: se reducen en el móvil antes de mandarlas. */

/** Máximo de fotos por mensaje (lo mismo que admite la API). */
export const MAX_PHOTOS = 4;
/** Lado largo máximo: suficiente para leer una báscula o una etiqueta. */
export const MAX_SIDE = 1280;

/** Tamaño final manteniendo la proporción; nunca agranda. */
export function fitSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Lee la foto, la reduce y la devuelve como JPEG en data URL. */
export async function photoToDataUrl(file: Blob, max = MAX_SIDE, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitSize(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
