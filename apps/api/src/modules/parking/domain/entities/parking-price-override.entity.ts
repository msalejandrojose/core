// Precio distinto al `pricePerDay` base de la plaza para un rango de fechas
// concreto (picos de demanda / eventos). Ver `pricing.ts` para el cálculo.
export interface ParkingPriceOverride {
  id: string;
  parkingId: string;
  startDate: Date;
  endDate: Date;
  pricePerDay: number;
  label: string | null;
  createdAt: Date;
}
