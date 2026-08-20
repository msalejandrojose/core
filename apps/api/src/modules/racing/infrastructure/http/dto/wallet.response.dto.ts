import { ApiProperty } from '@nestjs/swagger';
import { RacingWallet } from '../../../domain/entities/racing-wallet.entity';

export class WalletResponseDto {
  @ApiProperty() balance!: number;

  static fromDomain(wallet: RacingWallet): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.balance = wallet.balance;
    return dto;
  }

  /** Para operaciones que devuelven el saldo resultante sin construir una
   *  `RacingWallet` de por medio (p.ej. `PurchaseCarItemUseCase`). */
  static fromBalance(balance: number): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.balance = balance;
    return dto;
  }
}
