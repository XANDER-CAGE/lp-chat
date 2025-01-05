export interface IFiles {
  id?: string;
  bucket_name?: string;
  created_at?: Date;
  created_by: string;
  is_deleted?: boolean;
  type: string;
  name: string;
  size: number;
}
