import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class CreateMessageDto {
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

  @ApiPropertyOptional()
  // @IsOptional()
  @IsString()
  consultationId: string;
}

export class GetMessagesByChatIdDto extends PaginationDto {
  @ApiProperty()
  @IsString()
  chatId: string;
}
