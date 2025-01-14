import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Type } from 'class-transformer';
import { MessageTyepEnum } from '../enum';

export class MessageDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  content?: string;

  @ApiProperty({
    default: MessageTyepEnum.Text,
  })
  @IsEnum(MessageTyepEnum, { each: true })
  type: MessageTyepEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  repliedMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  createdAt?: Date;
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
  consultationId: string;
}

export class UpdateMessageDto extends MessageDto {
  @ApiProperty()
  @IsString()
  id: string;
}
