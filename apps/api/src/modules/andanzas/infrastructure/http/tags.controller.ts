import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { SuggestTagsUseCase } from '../../application/use-cases/suggest-tags.use-case';
import { SuggestTagsQueryDto } from './dto/suggest-tags.query.dto';
import { TagSuggestionResponseDto } from './dto/tag-suggestion.response.dto';

@ApiTags('andanzas/tags')
@Controller('andanzas/tags')
@Auth()
export class TagsController {
  constructor(private readonly suggestTags: SuggestTagsUseCase) {}

  @Get('suggest')
  @ApiOperation({
    summary: 'Autocompletar tags existentes por prefijo, para evitar duplicados.',
  })
  @ApiOkResponse({ type: TagSuggestionResponseDto, isArray: true })
  async suggest(
    @Query() query: SuggestTagsQueryDto,
  ): Promise<TagSuggestionResponseDto[]> {
    const suggestions = await this.suggestTags.execute(query.q);
    return suggestions.map((s) => TagSuggestionResponseDto.fromSuggestion(s));
  }
}
