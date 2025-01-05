import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(5)
  rate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  chatId: number;
}
