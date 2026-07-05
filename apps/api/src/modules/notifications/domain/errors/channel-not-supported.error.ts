import { DomainError } from '../../../../shared/errors/domain-error';

export class ChannelNotSupportedError extends DomainError {
  constructor(channel: string) {
    super(
      'CHANNEL_NOT_SUPPORTED',
      `No hay dispatcher registrado para el canal "${channel}".`,
      { channel },
    );
  }
}
