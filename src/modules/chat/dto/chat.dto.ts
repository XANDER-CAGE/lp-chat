import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateChatDto {
  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  topicId?: string;
}
