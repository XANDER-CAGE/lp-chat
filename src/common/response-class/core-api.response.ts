import { ApiProperty } from '@nestjs/swagger';

interface IpaginationArg {
  total: number;
  page: number;
  limit: number;
}

export class CoreApiResponse {
  @ApiProperty({ example: '17.07.2024, 18:06:33' })
  readonly timestamp: string;

  @ApiProperty()
  readonly success: boolean;

  @ApiProperty({ type: Object, example: null })
  readonly error: any;

  @ApiProperty({ type: Object, example: null })
  readonly pagination: any;
  readonly data: any;

  constructor(
    success: boolean,
    data?: any,
    pagination?: IpaginationArg,
    error?: any,
  ) {
    this.success = success;
    this.data = data || null;
    this.timestamp = new Date().toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
    });
    this.error = error;
    this.pagination = pagination ? this.paginate(pagination) : null;
  }

  public static success(data: any, pagination?: IpaginationArg) {
    return new CoreApiResponse(true, data, pagination, null);
  }

  public static error(error?: any) {
    return new CoreApiResponse(false, null, null, error);
  }

  private paginate(arg: IpaginationArg) {
    const { limit = 10, page = 1, total } = arg;
    return {
      total_items: total,
      total_pages: Math.ceil(total / limit),
      current_page: page,
      limit,
      offset: (page - 1) * limit,
    };
  }
}
