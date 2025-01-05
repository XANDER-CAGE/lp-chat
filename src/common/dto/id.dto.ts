import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class IdDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty()
  @Type(() => String)
  id: string;
}
