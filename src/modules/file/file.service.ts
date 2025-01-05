import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { MinioService } from 'nestjs-minio-client';
import { extname } from 'path';
import { env } from 'src/common/config/env.config';
import { BufferedFile } from 'src/common/interface/buffered-file.interface';
import { PrismaService } from '../prisma/prisma.service';
import { createWriteStream, unlinkSync } from 'fs';
import { pathToStatic } from 'src/common/var/index.var';

@Injectable()
export class FileService {
  private readonly bucketname = env.MINIO_BUCKET;
  constructor(
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  async upload(file: BufferedFile) {
    const mimeType = file.mimetype;
    const fileName: string = file.originalname;
    const fileBuffer = file.buffer;

    if (fileBuffer?.length / 1_000_000 > 20) {
      throw new ForbiddenException('More than 20 mb file upload is forbidden.');
    }
    return await this.prisma.$transaction(async (trx) => {
      const savedFile = await trx.file.create({
        data: {
          bucketName: this.bucketname,
          name: fileName,
          size: fileBuffer.length,
          type: mimeType,
        },
      });
      await this.minio.client.putObject(
        this.bucketname,
        `${savedFile.id}${extname(fileName)}`,
        file.buffer,
      );
      return savedFile;
    });
  }

  async getFile(fileId: number, response: Response) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    const stream = await this.minio.client.getObject(
      file.bucketName,
      `${file.id}${extname(file.name)}`,
    );
    response.set({
      'Content-Disposition': `attachment; filename="${file.name}"`,
    });
    response.status(200);
    stream.pipe(response);
  }

  async downloadToStatic(fileId: number) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    const filename = `${file.id}${extname(file.name)}`;
    const stream = await this.minio.client.getObject(file.bucketName, filename);
    const ws = createWriteStream(pathToStatic + filename);
    stream.pipe(ws);
    ws.on('finish', () => ws.close());
    await new Promise((resolve) => ws.on('finish', resolve));
  }

  async deleteFromStatic(path: string) {
    unlinkSync(path);
  }

  async getUrl(fileId: number) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    const filename = `${file.id}${extname(file.name)}`;
    return await this.minio.client.presignedGetObject(
      file.bucketName,
      filename,
    );
  }
}
