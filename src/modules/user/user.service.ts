import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { user } from '@prisma/client';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { env } from 'process';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async findAll() {
    return await this.prisma.$queryRaw`
    SELECT u.*, AVG(r."rate")::double precision AS rate 
    FROM "user" u  
    LEFT JOIN "chat" ch ON ch."operator_id" = u."id" 
    LEFT JOIN "rating" r ON r."chat_id" = ch."id"
    -- WHERE u."telegram_id" IS NOT NULL
    GROUP BY u."id";  
`;
  }

  async update(id: string, dto: UpdateUserDto) {
    const operator = await this.prisma.user.findFirst({
      where: { id, telegramId: { not: null } },
    });
    if (!operator) throw new NotFoundException('Operator not found');
    await this.prisma.user.update({
      where: { id },
      data: {
        approvedAt: dto.approve ? new Date() : null,
        blockedAt: dto.block ? new Date() : null,
      },
    });
  }

  async validate(token: any) {
    try {
      const content: any = await this.verifyTokenAndSetUser(token);

      const dataFromJwt = {
        email: content.email,
        phone: content.phone_number,
        firstname: content.first_name,
        lastname: content.last_name,
        username: content?.username,
        userId: content?.userType === 'user' ? content?.id : null,
        doctorId: content?.userType === 'doctor' ? content?.id : null,
      };

      if (!dataFromJwt.userId && !dataFromJwt.doctorId)
        throw new NotFoundException('User not found');

      const user = await this.prisma.user.upsert({
        where: { userId: dataFromJwt?.userId, doctorId: dataFromJwt?.doctorId },
        create: dataFromJwt,
        update: dataFromJwt,
      });

      const data: user = { ...content, ...user };
      return CoreApiResponse.success(data);
    } catch (error) {
      return CoreApiResponse.error(error);
    }
  }

  private async verifyTokenAndSetUser(
    token: string,
  ): Promise<'user' | 'doctor'> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: env.JWT_SECRET,
      });
      return { ...payload, userType: 'user' };
    } catch {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: env.JWT_SECRET_DOCTOR,
        });
        return { ...payload, userType: 'doctor' };
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }
  }

  async getShifts(id: string) {
    return await this.prisma.shift.findMany({
      where: { operatorId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
