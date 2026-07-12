import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { FollowUserUseCase } from '../../application/use-cases/follow-user.use-case';
import { UnfollowUserUseCase } from '../../application/use-cases/unfollow-user.use-case';
import { ListFollowingUseCase } from '../../application/use-cases/list-following.use-case';
import { ListFollowersUseCase } from '../../application/use-cases/list-followers.use-case';
import { FollowUserDto } from './dto/follow-user.dto';
import { ListFollowsQueryDto } from './dto/list-follows.query.dto';
import { UserRefResponseDto } from './dto/user-ref.response.dto';

@ApiTags('andanzas/follows')
@Controller('andanzas/follows')
@Auth()
export class FollowsController {
  constructor(
    private readonly followUser: FollowUserUseCase,
    private readonly unfollowUser: UnfollowUserUseCase,
    private readonly listFollowing: ListFollowingUseCase,
    private readonly listFollowers: ListFollowersUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Seguir a otro usuario (idempotente).' })
  @ApiCreatedResponse({ description: 'Seguido (o ya lo seguías).' })
  async follow(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: FollowUserDto,
  ): Promise<void> {
    await this.followUser.execute({
      followerId: user.sub,
      followingId: dto.followingId,
    });
  }

  @Delete(':followingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dejar de seguir a un usuario (idempotente).' })
  @ApiNoContentResponse()
  async unfollow(
    @CurrentUser() user: AccessTokenPayload,
    @Param('followingId') followingId: string,
  ): Promise<void> {
    await this.unfollowUser.execute({ followerId: user.sub, followingId });
  }

  @Get('following')
  @ApiOperation({ summary: 'A quién sigues.' })
  @ApiCursorPaginatedResponse(UserRefResponseDto)
  async getFollowing(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListFollowsQueryDto,
  ): Promise<CursorPaginatedResponseDto<UserRefResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listFollowing.execute({
      userId: user.sub,
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((u) => UserRefResponseDto.fromUserRef(u)),
      page.nextCursor,
      limit,
    );
  }

  @Get('followers')
  @ApiOperation({ summary: 'Quién te sigue.' })
  @ApiCursorPaginatedResponse(UserRefResponseDto)
  async getFollowers(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListFollowsQueryDto,
  ): Promise<CursorPaginatedResponseDto<UserRefResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listFollowers.execute({
      userId: user.sub,
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((u) => UserRefResponseDto.fromUserRef(u)),
      page.nextCursor,
      limit,
    );
  }
}
