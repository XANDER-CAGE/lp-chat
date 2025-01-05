import { ApiProperty } from '@nestjs/swagger';
import { CoreApiResponse } from './core-api.response';

export class DeleteApiResponse extends CoreApiResponse {
  @ApiProperty({ type: Object, example: null })
  data: null;
}
