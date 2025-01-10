import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
      with my_user as (
        select id as user_id, first_name, last_name, role::text, null as doctor_id
        from auth.users as au
        where au.is_deleted is false
          and au.is_verified is true
        union
        select null as user_id, first_name, last_name, role::text, id as doctor_id
        from doctor.doctors as dd
        where dd.is_deleted is false
          and dd.is_verified is true
      )
      select cu.id,
             cu.user_id,
             cu.doctor_id,
             mu.role,
             cu.firstname,
             cu.lastname,
             cu.shift_status,
             cu.telegram_id,
             cu.username,
             cu.email,
             cu.phone,
             cu.approved_at,
             cu.blocked_at
      from my_user as mu
      join chat."user" as cu on (cu.doctor_id = mu.doctor_id or cu.user_id = mu.user_id)
      where cu.is_deleted is false;
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
        where: {
          userId: dataFromJwt?.userId,
          doctorId: dataFromJwt?.doctorId,
          isDeleted: false,
        },
        create: dataFromJwt,
        update: dataFromJwt,
      });

      const data: user = { ...content, ...user };
      return CoreApiResponse.success(data);
    } catch (error) {
      return CoreApiResponse.error(error);
    }
  }

  private async verifyTokenAndSetUser(token: string): Promise<'user' | 'doctor'> {
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
      where: { operatorId: id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }
}
