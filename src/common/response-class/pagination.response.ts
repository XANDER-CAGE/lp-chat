import { ApiProperty } from '@nestjs/swagger';

export class PaginationRes {
  @ApiProperty()
  total_items: number;

  @ApiProperty()
  total_pages: number;

  @ApiProperty()
  current_page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}
