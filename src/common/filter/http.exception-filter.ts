import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CoreApiResponse } from '../response-class/core-api.response';
import { Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    console.log(exception);
    if (exception instanceof HttpException) {
      const data = CoreApiResponse.error(exception.getResponse());
      response.status(exception.getStatus()).json(data);
    } else {
      const error = new InternalServerErrorException();
      const data = CoreApiResponse.error(error.getResponse());
      response.status(500).json(data);
    }
  }
}
