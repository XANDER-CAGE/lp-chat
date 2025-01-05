import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class IdDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
