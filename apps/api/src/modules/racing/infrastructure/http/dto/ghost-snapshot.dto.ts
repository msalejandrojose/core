import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min, ValidateNested } from 'class-validator';

export class GhostSnapshotPositionDto {
  @ApiProperty() @IsNumber() x!: number;
  @ApiProperty() @IsNumber() y!: number;
  @ApiProperty() @IsNumber() z!: number;
}

// Una instantánea de posición/rotación (TASK-219/220/221): snapshots a
// ~20 Hz, interpolados en el cliente. Sin validar aquí que la separación
// entre `t` consecutivos ronde los 50 ms — el servidor no reproduce la
// física, solo guarda lo que el cliente ya grabó localmente.
export class GhostSnapshotDto {
  @ApiProperty({ description: 'Milisegundos desde el inicio de la vuelta.' })
  @IsInt()
  @Min(0)
  t!: number;

  @ApiProperty({ type: GhostSnapshotPositionDto })
  @ValidateNested()
  @Type(() => GhostSnapshotPositionDto)
  pos!: GhostSnapshotPositionDto;

  @ApiProperty({ description: 'Rotación en el eje Y, en radianes.' })
  @IsNumber()
  yaw!: number;
}
