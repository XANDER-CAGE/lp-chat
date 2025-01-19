import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageTypeEnum } from '../enum';

export class MessageDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  content?: string;

  @ApiProperty({
    default: MessageTypeEnum.Text,
  })
  @IsEnum(MessageTypeEnum, { each: true })
  type: MessageTypeEnum;

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

  @ApiPropertyOptional()
  @IsString()
  @Length(36)
  @ValidateIf((x) => x.type == MessageTypeEnum.Payment)
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @ValidateIf((x) => x.type == MessageTypeEnum.Rate)
  rate?: number;
}

export class CreateMessageDto {
  @ApiPropertyOptional()
  @IsString()
  consultationId: string;

  @ApiPropertyOptional()
  @IsString()
  operatorId: string;

  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  @IsNotEmpty()
  @Type(() => MessageDto)
  messages: MessageDto[];
}

export class GetMessagesByChatIdDto {
  @ApiProperty({ default: 'd3761737-05f1-4c53-9576-a69613b8d49d' })
  @IsString()
  @Length(36)
  consultationId: string;
}

export class UpdateMessageDto extends MessageDto {
  @ApiProperty()
  @IsString()
  id: string;
}

export class CreatePaymentMessageDto {
  @ApiPropertyOptional()
  @IsString()
  consultationId: string;

  @ApiPropertyOptional()
  @IsString()
  transactionId: string;
}

export class CreateRateMessageDto {
  @ApiPropertyOptional()
  @IsString()
  consultationId: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Length(1, 5)
  rate: number;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  comment: string;
}

export class PayTransactionDto {
  @ApiProperty({ example: 'payme' })
  @IsString()
  paymentProvider: string;

  @ApiProperty({ example: 50000.0 })
  @IsDefined()
  @IsNumber()
  amount: number;

  @IsString()
  @IsUUID()
  @ApiProperty({ example: 'transactionId' })
  transactionId: string;

  @IsObject()
  @IsOptional()
  @ApiProperty({ default: CreateMessageDto })
  @Type(() => CreateMessageDto)
  startChat?: CreateMessageDto;
}
