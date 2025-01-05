import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { FileService } from './file.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BufferedFile } from 'src/common/interface/buffered-file.interface';
import { Response } from 'express';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';

@ApiBearerAuth('authorization')
@ApiTags('Files')
@Controller('files')
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
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: BufferedFile) {
    const data = await this.fileService.upload(file);
    return CoreApiResponse.success(data);
  }

  @Get()
  getFile(@Query('fileId') fileId: string, @Res() res: Response) {
    return this.fileService.getFile(fileId, res);
  }
}
