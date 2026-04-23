import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * RequireCustomerJwtGuard — decodes Bearer token and rejects if missing/invalid.
 * Populates req.user = { id, email }
 */
@Injectable()
export class RequireCustomerJwtGuard {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Token requerido');

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      request['user'] = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractToken(req: any): string | null {
    const auth: string = req.headers?.authorization ?? '';
    return auth.startsWith('Bearer ') ? auth.slice(7) : null;
  }
}

/**
 * OptionalCustomerJwtGuard — always allows the request through.
 * If a valid Bearer token is present it populates req.user; otherwise req.user is undefined.
 */
@Injectable()
export class OptionalCustomerJwtGuard {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth: string = request.headers?.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        request['user'] = { id: payload.sub, email: payload.email };
      } catch {
        // Invalid token — treat as guest, don't throw
      }
    }
    return true;
  }
}
