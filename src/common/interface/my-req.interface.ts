export interface IUser {
  id?: string;
  userId?: string;
  doctorId?: string;
  role?: string;
  firstname?: string;
  lastname?: string;
  shift_status?: string;
  telegram_id?: string;
  username?: string;
  email?: string;
  phone?: string;
  approved_at?: Date | null;
  blocked_at?: Date | null;
}
