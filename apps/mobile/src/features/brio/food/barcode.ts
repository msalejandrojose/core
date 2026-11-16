/**
 * Abre la cámara para leer el código de barras de un envase. Devuelve el
 * código (solo dígitos) o null si se cancela o no es un EAN/UPC.
 *
 * El plugin se carga al usarlo: en web trae un lector de QR de varios cientos
 * de KB que no tiene por qué ir en el paquete principal.
 */
export async function scanFoodBarcode(): Promise<string | null> {
  try {
    const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import('@capacitor/barcode-scanner');
    const r = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      scanInstructions: 'Apunta al código de barras del envase',
      cancelButtonAccessibilityLabel: 'Cancelar',
    });
    const code = r.ScanResult?.trim() ?? '';
    return /^\d{6,14}$/.test(code) ? code : null;
  } catch {
    // Cancelado o sin permiso de cámara.
    return null;
  }
}
