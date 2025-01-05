import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  block: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approve: boolean;
}
