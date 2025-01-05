import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { env } from './env.config';

export const KeycloakModule = KeycloakConnectModule.register({
  authServerUrl: env.KEYCLOAK_HOST,
  realm: env.KEYCLOAK_REALM,
  clientId: env.KEYCLOAK_CLIENT_ID,
  secret: env.KEYCLOAK_CLIENT_SECRET,
});
