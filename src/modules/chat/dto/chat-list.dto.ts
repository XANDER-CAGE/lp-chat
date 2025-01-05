import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class ChatListDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  operatorPhoneNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userEmail?: string;
}
