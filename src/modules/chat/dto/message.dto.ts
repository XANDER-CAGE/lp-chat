import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Type } from 'class-transformer';

export class MessageDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  repliedMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileId?: string;
}

export class CreateMessageDto {
  @ApiPropertyOptional()
  @IsString()
  consultationId: string;

  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  @Type(() => MessageDto)
  messages: MessageDto[];
}

export class GetMessagesByChatIdDto extends PaginationDto {
  @ApiProperty()
  @IsString()
  chatId: string;
}
