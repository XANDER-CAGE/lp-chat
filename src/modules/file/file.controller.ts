import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileService } from './file.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BufferedFile } from 'src/common/interface/buffered-file.interface';
import { Response } from 'express';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { User } from '../../common/decorator/user.decorator';
import { IUser } from '../../common/interface/my-req.interface';

@ApiBearerAuth('authorization')
@ApiTags('Files')
@Controller('files')
@UseGuards(AuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: BufferedFile, @User() user: IUser) {
    const data = await this.fileService.upload(file, user);
    return CoreApiResponse.success(data);
  }

  @Get('download')
  getFile(@Query('fileId') fileId: string, @Res() res: Response, @User() user: IUser) {
    return this.fileService.download(fileId, res, user);
  }
}
