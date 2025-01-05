import { user } from '@prisma/client';
import { UserFromKeycloak } from '../type/userFromKeycloak.type';

export interface IMyReq extends Request {
  user: user & UserFromKeycloak;
}
