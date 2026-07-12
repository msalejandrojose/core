import { ApiProperty } from '@nestjs/swagger';
import { TagSuggestion } from '../../../domain/tags/suggest-tags';

export class TagSuggestionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static fromSuggestion(suggestion: TagSuggestion): TagSuggestionResponseDto {
    const dto = new TagSuggestionResponseDto();
    dto.id = suggestion.id;
    dto.name = suggestion.name;
    return dto;
  }
}
