import { Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type { RitmoAccountExport } from '../../application/ports/ritmo-account-repository.port';
import { DeleteMyAccountUseCase } from '../../application/use-cases/delete-my-account.use-case';
import { ExportMyDataUseCase } from '../../application/use-cases/export-my-data.use-case';

// Privacidad y datos: descarga y borrado de la cuenta propia. Siempre sobre
// `current.sub`; no hay forma de tocar otra cuenta desde aquí.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo/account')
export class RitmoAccountController {
  constructor(
    private readonly exportMyData: ExportMyDataUseCase,
    private readonly deleteMyAccount: DeleteMyAccountUseCase,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Descargar todos mis datos de Ritmo (JSON).' })
  @ApiOkResponse({ description: 'Volcado completo de la cuenta.' })
  async export(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<RitmoAccountExport> {
    return this.exportMyData.execute(current.sub);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar mi cuenta y todos mis datos. No se puede deshacer.',
  })
  @ApiNoContentResponse()
  async remove(@CurrentUser() current: AccessTokenPayload): Promise<void> {
    await this.deleteMyAccount.execute(current.sub);
  }
}
