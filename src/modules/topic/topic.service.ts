import { Injectable } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createTopicDto: CreateTopicDto) {
    return await this.prisma.topic.create({ data: createTopicDto });
  }

  async findAll() {
    return await this.prisma.topic.findMany();
  }

  async update(id: number, updateTopicDto: UpdateTopicDto) {
    return await this.prisma.topic.update({
      where: { id },
      data: updateTopicDto,
    });
  }

  async remove(id: number) {
    return await this.prisma.topic.delete({ where: { id } });
  }
}
