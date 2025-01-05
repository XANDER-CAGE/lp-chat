import { Prisma } from '@prisma/client';

export type usersWithChats = Prisma.userGetPayload<{
  include: { rejectedChats: true };
}>;
