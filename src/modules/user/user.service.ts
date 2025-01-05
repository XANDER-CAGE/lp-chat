import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
import KeycloakConnect from 'keycloak-connect';
import { UserFromKeycloak } from 'src/common/type/userFromKeycloak.type';
import { user } from '@prisma/client';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(KEYCLOAK_INSTANCE)
    private readonly keycloak: KeycloakConnect.Keycloak,
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

  async update(id: number, dto: UpdateUserDto) {
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
    const gm = this.keycloak.grantManager;
    try {
      const grant: any = await gm.createGrant({ access_token: token });
      if (grant.isExpired()) throw new Error();
      const content = grant.access_token.content;

      const dataFromJwt = {
        email: content.email,
        firstname: content.given_name,
        lastname: content.family_name,
        username: content.preferred_username,
        kcUserId: content.sub,
      };

      const user = await this.prisma.user.upsert({
        where: { kcUserId: content.sub },
        create: dataFromJwt,
        update: dataFromJwt,
      });
      const data: user & UserFromKeycloak = { ...content, ...user };
      return CoreApiResponse.success(data);
    } catch (error) {
      return CoreApiResponse.error(error);
    }
  }

  async getShifts(id: number) {
    return await this.prisma.shift.findMany({
      where: { operatorId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
