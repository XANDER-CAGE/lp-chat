import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateChatDto {
  @ApiPropertyOptional({
    required: false,
    description: 'Topic ID or Consolation Id',
  })
  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  type: string;

  @ApiPropertyOptional({
    required: false,
    description: 'User ID',
  })
  // @IsOptional()
  @IsString()
  consultationId?: string;
}
