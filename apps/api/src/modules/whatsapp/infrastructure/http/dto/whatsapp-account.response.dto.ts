import { ApiProperty } from '@nestjs/swagger';
import type { WhatsappAccountSummary } from '../../../application/ports/whatsapp-account-resolver.port';

export class WhatsappAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  phoneNumberId!: string | null;

  static fromSummary(a: WhatsappAccountSummary): WhatsappAccountResponseDto {
    const dto = new WhatsappAccountResponseDto();
    dto.id = a.id;
    dto.name = a.name;
    dto.phoneNumberId = a.phoneNumberId;
    return dto;
  }
}
