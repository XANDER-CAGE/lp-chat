import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatListDto } from './chat-list.dto';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RejectedChatListDto extends ChatListDto {
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  chatId?: number = 10;
}
