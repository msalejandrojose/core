import { create } from 'zustand';

/**
 * Lista de la compra de ejemplo (lienzo "Lista de la compra"). Ritmo aún no
 * guarda menús ni listas: lo que marcas vive solo en esta sesión.
 */
interface ShoppingState {
  got: Record<string, boolean>;
  toggleGot: (id: string) => void;
}

export const usePlanStore = create<ShoppingState>()((set) => ({
  got: { platanos: true, huevos: true, leche: true, avena: true },
  toggleGot: (id) => set((s) => ({ got: { ...s.got, [id]: !s.got[id] } })),
}));
