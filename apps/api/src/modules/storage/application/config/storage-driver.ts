import { StorageDriverName } from '../../domain/entities/stored-file.entity';

/** Wrapper inyectable que expone el driver activo (`STORAGE_DRIVER`) a los use cases. */
export class StorageDriver {
  constructor(public readonly name: StorageDriverName) {}
}
