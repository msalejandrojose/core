import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export const CIRCUIT_ROTATION_CONFIG_KEY = ['racing-circuit-rotation-configs'];

/** Los parámetros de la rotación diaria de circuitos — sin paginar, es un
 *  conjunto cerrado. */
export function useCircuitRotationConfigs() {
  return useQuery({
    queryKey: CIRCUIT_ROTATION_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/circuit-rotation-config');
      if (error) throw error;
      return data;
    },
  });
}
