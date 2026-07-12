// Foto de una plaza: vínculo 1-1 con un StoredFile ya subido (módulo storage).
export interface ParkingPhoto {
  id: string;
  parkingId: string;
  storedFileId: string;
  position: number;
  createdAt: Date;
}
