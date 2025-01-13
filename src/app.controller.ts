import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { CoreApiResponse } from './common/response-class/core-api.response';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('')
@ApiBearerAuth('authorization')
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get('auth/register')
  async registerUserWithToken(@Req() req: any) {
    const data = await this.appService.registerUserWithToken(req.headers.authorization);
    return CoreApiResponse.success(data);
  }
}
