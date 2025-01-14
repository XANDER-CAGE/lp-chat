import { Injectable } from '@nestjs/common';
import { PrismaService } from './modules/prisma/prisma.service';
import { env } from 'process';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async registerUserWithToken(token: string) {
    const parseUser: any = await this.parseToken(this.extractTokenFromHeader(token));

    const userId = parseUser.userType === 'user' ? parseUser.id : null;
    const doctorId = parseUser.userType === 'doctor' ? parseUser.id : null;

    let user = await this.prisma.user.findFirst({
      where: {
        isDeleted: false,
        userId,
        doctorId,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          userId,
          doctorId,
          firstname: parseUser.first_name,
          lastname: parseUser.last_name,
          phone: parseUser.phone_number,
          email: parseUser.email,
        },
      });
    }

    return user;
  }

  private async parseToken(token: string): Promise<'user' | 'doctor'> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: env.JWT_SECRET,
      });

      return { ...payload, userType: 'user' };
    } catch {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: env.JWT_SECRET_DOCTOR,
      });
      return { ...payload, userType: 'doctor' };
    }
  }

  private extractTokenFromHeader(payloadToken: string): string | undefined {
    const [type, token] = payloadToken.split(' ') ?? [];
    return type === 'Bearer' ? token.trim() : undefined;
  }
}
