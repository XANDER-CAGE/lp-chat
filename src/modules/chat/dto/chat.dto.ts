import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class CreateChatDto {
  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsNumber()
  topicId?: number;
}
