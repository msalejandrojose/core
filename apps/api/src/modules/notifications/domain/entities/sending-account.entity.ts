import type { SendingAccountType } from './sending-account-type.entity';

export interface SendingAccount {
  id: string;
  typeId: string;
  name: string;
  /** Config validada contra el catálogo del canal. Los campos secretos van
   *  cifrados en reposo; se descifran solo en el momento del envío. */
  config: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** El tipo se incluye cuando el repositorio lo carga (para derivar el canal). */
  type?: SendingAccountType;
}
