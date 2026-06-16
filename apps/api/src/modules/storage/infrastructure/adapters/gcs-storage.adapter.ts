import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  ObjectStat,
  SignedUploadUrl,
  StoragePort,
} from '../../application/ports/storage.port';

const NOT_IMPLEMENTED = 'El driver GCS todavía no está implementado.';

/** Placeholder. El driver GCS real queda fuera del alcance inicial del módulo. */
@Injectable()
export class GcsStorageAdapter implements StoragePort {
  put(): Promise<void> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }

  get(): Promise<Buffer> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }

  delete(): Promise<void> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }

  exists(): Promise<boolean> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }

  stat(): Promise<ObjectStat | null> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }

  getSignedUrl(): Promise<string> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }

  getSignedUploadUrl(): Promise<SignedUploadUrl> {
    throw new NotImplementedException(NOT_IMPLEMENTED);
  }
}
