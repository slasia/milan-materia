import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/** Guard that requires a valid customer JWT (role: customer) */
@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) throw new UnauthorizedException('Se requiere autenticación');

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'super-secret-change-in-production',
      });
      if (payload.role !== 'customer') throw new UnauthorizedException('Acceso denegado');
      req['user'] = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }
}

/** Guard that OPTIONALLY accepts a customer JWT — never throws, just sets req.user if valid */
@Injectable()
export class OptionalCustomerJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return true;

    try {
      const payload = this.jwtService.verify(auth.slice(7), {
        secret: this.config.get<string>('JWT_SECRET') || 'super-secret-change-in-production',
      });
      if (payload.role === 'customer') {
        req['user'] = { id: payload.sub, email: payload.email, role: payload.role };
      }
    } catch {
      // Invalid token — ignore, proceed as guest
    }
    return true;
  }
}
