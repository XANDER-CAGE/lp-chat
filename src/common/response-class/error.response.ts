import { ApiProperty } from '@nestjs/swagger';
import { CoreApiResponse } from './core-api.response';

class ErrorRes {
  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  statusCode: number;
}

export class ErrorApiResponse extends CoreApiResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ type: Object, example: null })
  data: null;

  @ApiProperty({ type: Object, example: null })
  pagination: null;

  @ApiProperty({ type: ErrorRes, example: ErrorRes })
  error: ErrorRes;
}
