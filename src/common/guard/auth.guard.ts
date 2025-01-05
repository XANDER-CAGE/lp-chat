import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { env } from '../config/env.config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: env.JWT_SECRET,
      });
      request['user'] = payload;
    } catch {
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: env.JWT_SECRET_DOCTOR,
        });
        request['doctor'] = payload;
      } catch {
        return false;
      }
    }
    request['token'] = token;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
