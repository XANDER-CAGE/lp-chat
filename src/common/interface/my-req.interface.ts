import { user } from '@prisma/client';
import { UserFromKeycloak } from '../type/userFromKeycloak.type';

export interface IMyReq extends Request {
  user: user & UserFromKeycloak;
}

export interface IUser {
  id: string;
  user_id: string;
  doctor_id: string;
  role: string;
  firstname: string;
  lastname: string;
  shift_status: string;
  telegram_id: string;
  username: string;
  email: string;
  phone: string;
  approved_at: Date | null;
  blocked_at: Date | null;
}
