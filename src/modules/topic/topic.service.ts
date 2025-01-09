import { Injectable } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';

@Injectable()
export class TopicService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createTopicDto: CreateTopicDto) {
    const data = await this.prisma.topic.create({ data: createTopicDto });
    return CoreApiResponse.success(data);
  }

  async findAll() {
    const data = await this.prisma.topic.findMany({
      where: { isDeleted: false },
    });
    return CoreApiResponse.success(data);
  }

  async update(id: string, updateTopicDto: UpdateTopicDto) {
    const data = await this.prisma.topic.update({
      where: { id },
      data: updateTopicDto,
    });
    return CoreApiResponse.success(data);
  }

  async remove(id: string, user: any) {
    const data = await this.prisma.topic.update({
      where: { id },
      data: { isDeleted: true, createdAt: new Date(), deletedBy: user?.id },
    });

    return CoreApiResponse.success(data);
  }
}
