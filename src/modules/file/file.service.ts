import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { MinioService } from 'nestjs-minio-client';
import { extname } from 'path';
import { BufferedFile } from 'src/common/interface/buffered-file.interface';
import { PrismaService } from '../prisma/prisma.service';
import { createWriteStream, unlinkSync } from 'fs';
import { pathToStatic } from 'src/common/var/index.var';
import { getBucketName, objectId } from '../../common/util/formate-message.util';
import { IUser } from '../../common/interface/my-req.interface';

@Injectable()
export class FileService {
  constructor(
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  async upload(file: BufferedFile, user: IUser) {
    const mimeType = file.mimetype;
    // if (!mimeType.includes('image')) {
    //   throw new ForbiddenException('Only image files are allowed');
    // }

    const orginalName: string = file.originalname.trim().replace(' ', '');
    const fileBuffer = file.buffer;

    if (fileBuffer?.length / 1_000_000 > 20) {
      throw new ForbiddenException('More than 20 mb file upload is forbidden.');
    }
    const fileId = objectId();
    const fileName = `${fileId}${extname(orginalName)}`;
    const bucketName = mimeType.includes('image') ? 'images' : getBucketName();
    const path = mimeType.includes('image') ? `/images/${fileName}` : null;
    return this.prisma.$transaction(async (trx) => {
      const savedFile = await trx.file.create({
        data: {
          id: fileId,
          bucketName: bucketName,
          name: fileName,
          size: fileBuffer.length,
          type: mimeType,
          createdBy: user.userId || user.doctorId,
          path,
        },
      });
      await this.minio.client.putObject(
        bucketName,
        `${savedFile.id}${extname(fileName)}`,
        file.buffer,
      );
      return savedFile;
    });
  }

  async download(fileId: string, response: Response, user: IUser) {
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
    await this.prisma.downloadHistory.create({
      data: {
        userId: user.userId,
        doctorId: user.doctorId,
        fileId: fileId,
      },
    });
  }

  async downloadToStatic(fileId: string) {
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

  async getUrl(fileId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    const filename = `${file.id}${extname(file.name)}`;
    return await this.minio.client.presignedGetObject(file.bucketName, filename);
  }
}
