import { Role } from '../enum/role.enum';

export type UserFromKeycloak = {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  session_state: string;
  acr: string;
  realm_access: { roles: Array<string> };
  resource_access: any;
  scope: string;
  email_verified: boolean;
  name: string;
  role_code: Role;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
};
