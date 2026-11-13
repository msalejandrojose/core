import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  CHALLENGE_KINDS,
  CHALLENGE_WEEKS,
  type ChallengeKind,
} from '../../domain/services/social';
import {
  SocialChallengesUseCase,
  SocialFeedUseCase,
  SocialPeopleUseCase,
  SocialProfileUseCase,
  type ChallengeView,
  type FeedItem,
  type MeView,
  type PeopleView,
  type PersonProfile,
  type PersonView,
} from '../../application/use-cases/social.use-cases';

export class UpdateSocialMeDto {
  @ApiPropertyOptional({ example: 'laurag' })
  @IsOptional()
  @IsString()
  @MaxLength(31)
  handle?: string;

  @ApiPropertyOptional({
    description: 'Compartir entrenos y objetivos con mis amigos.',
  })
  @IsOptional()
  @IsBoolean()
  shareActivity?: boolean;
}

export class CreateChallengeDto {
  @ApiProperty({ enum: CHALLENGE_KINDS })
  @IsIn(CHALLENGE_KINDS as readonly string[])
  kind!: ChallengeKind;

  @ApiProperty({ enum: CHALLENGE_WEEKS })
  @IsIn(CHALLENGE_WEEKS as readonly number[])
  weeks!: number;

  @ApiProperty({ type: [String], description: 'Amigos a los que retas.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(11)
  @IsUUID('all', { each: true })
  friendIds!: string[];
}

export class SearchPeopleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) q?: string;
}

// Social: amigos (seguimiento mutuo), su actividad y retos. Solo se comparte
// entrenos y objetivos; nunca peso ni comidas.
@ApiTags('brio')
@Auth()
@Controller('brio/social')
export class BrioSocialController {
  constructor(
    private readonly profile: SocialProfileUseCase,
    private readonly people: SocialPeopleUseCase,
    private readonly feedUseCase: SocialFeedUseCase,
    private readonly challenges: SocialChallengesUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Mi perfil social.' })
  @ApiOkResponse({ description: 'Nombre de usuario y qué comparto.' })
  me(@CurrentUser() current: AccessTokenPayload): Promise<MeView> {
    return this.profile.get(current.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Cambiar mi usuario o lo que comparto.' })
  @ApiOkResponse({ description: 'Perfil actualizado.' })
  putMe(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: UpdateSocialMeDto,
  ): Promise<MeView> {
    return this.profile.update(current.sub, dto);
  }

  @Get('people')
  @ApiOperation({
    summary: 'Mis amigos y seguimientos; con `q`, buscar personas.',
  })
  @ApiOkResponse({ description: 'Personas y su relación conmigo.' })
  async getPeople(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: SearchPeopleDto,
  ): Promise<PeopleView | { results: PersonView[] }> {
    return query.q?.trim()
      ? { results: await this.people.search(current.sub, query.q) }
      : this.people.list(current.sub);
  }

  @Get('people/:id')
  @ApiOperation({ summary: 'Lo que comparte una persona conmigo.' })
  @ApiOkResponse({ description: 'Perfil de la persona.' })
  getPerson(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PersonProfile> {
    return this.people.profile(current.sub, id);
  }

  @Put('follows/:id')
  @ApiOperation({ summary: 'Seguir a una persona.' })
  @ApiOkResponse({ description: 'Relación resultante.' })
  follow(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PersonView> {
    return this.people.setFollow(current.sub, id, true);
  }

  @Delete('follows/:id')
  @ApiOperation({ summary: 'Dejar de seguir a una persona.' })
  @ApiOkResponse({ description: 'Relación resultante.' })
  unfollow(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PersonView> {
    return this.people.setFollow(current.sub, id, false);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Actividad reciente de mis amigos.' })
  @ApiOkResponse({ description: 'Logros de la última semana.' })
  feed(@CurrentUser() current: AccessTokenPayload): Promise<FeedItem[]> {
    return this.feedUseCase.feed(current.sub);
  }

  @Put('cheers/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar ánimo a un logro o a un reto.' })
  @ApiNoContentResponse({ description: 'Ánimo dado.' })
  cheer(
    @CurrentUser() current: AccessTokenPayload,
    @Param('key') key: string,
  ): Promise<void> {
    return this.feedUseCase.setCheer(current.sub, key, true);
  }

  @Delete('cheers/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar mi ánimo.' })
  @ApiNoContentResponse({ description: 'Ánimo quitado.' })
  uncheer(
    @CurrentUser() current: AccessTokenPayload,
    @Param('key') key: string,
  ): Promise<void> {
    return this.feedUseCase.setCheer(current.sub, key, false);
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Mis retos, con su clasificación.' })
  @ApiOkResponse({ description: 'Retos activos y recién terminados.' })
  getChallenges(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<ChallengeView[]> {
    return this.challenges.list(current.sub);
  }

  @Post('challenges')
  @ApiOperation({ summary: 'Crear un reto con amigos, desde hoy.' })
  @ApiOkResponse({ description: 'Reto creado.' })
  postChallenge(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: CreateChallengeDto,
  ): Promise<ChallengeView> {
    return this.challenges.create(current.sub, dto);
  }

  @Delete('challenges/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salir de un reto (o borrarlo si es mío).' })
  @ApiNoContentResponse({ description: 'Hecho.' })
  deleteChallenge(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.challenges.leave(current.sub, id);
  }
}
