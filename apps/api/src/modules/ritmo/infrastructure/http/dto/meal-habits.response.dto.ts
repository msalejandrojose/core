import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  HabitCombo,
  HabitItem,
  MealHabits,
} from '../../../domain/services/habits';

export class HabitItemResponseDto {
  @ApiProperty({ description: 'foodId, o "text:<nombre>" si es texto libre.' })
  key: string;
  @ApiPropertyOptional() foodId: string | null;
  @ApiProperty({ example: 'Tortilla francesa' }) name: string;
  @ApiProperty({ example: 120, description: 'Última cantidad registrada.' })
  quantityG: number;
  @ApiProperty({ example: 190 }) kcal: number;
  @ApiProperty() proteinG: number;
  @ApiProperty() carbsG: number;
  @ApiProperty() fatG: number;
  @ApiProperty({ example: 9 }) count: number;
  @ApiProperty({ example: '2026-11-10' }) lastOn: string;

  static from(i: HabitItem): HabitItemResponseDto {
    return Object.assign(new HabitItemResponseDto(), i);
  }
}

export class HabitComboResponseDto {
  @ApiProperty({ type: [HabitItemResponseDto] }) items: HabitItemResponseDto[];
  @ApiProperty({ example: 9 }) count: number;
  @ApiProperty({ example: 620 }) kcal: number;

  static from(c: HabitCombo): HabitComboResponseDto {
    const dto = new HabitComboResponseDto();
    dto.items = c.items.map((item) => HabitItemResponseDto.from(item));
    dto.count = c.count;
    dto.kcal = c.kcal;
    return dto;
  }
}

export class MealHabitsResponseDto {
  @ApiProperty({ type: [HabitComboResponseDto], description: 'Lo de siempre.' })
  combos: HabitComboResponseDto[];
  @ApiProperty({ type: [HabitItemResponseDto] })
  frequent: HabitItemResponseDto[];
  @ApiProperty({ type: [HabitItemResponseDto] }) recent: HabitItemResponseDto[];

  static from(h: MealHabits): MealHabitsResponseDto {
    const dto = new MealHabitsResponseDto();
    dto.combos = h.combos.map((item) => HabitComboResponseDto.from(item));
    dto.frequent = h.frequent.map((item) => HabitItemResponseDto.from(item));
    dto.recent = h.recent.map((item) => HabitItemResponseDto.from(item));
    return dto;
  }
}
