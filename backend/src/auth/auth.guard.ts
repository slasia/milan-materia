import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Validates any JWT (admin or customer). Populates req.user. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * AdminJwtGuard — validates JWT AND checks role === 'admin'.
 * Returns 401 if no/invalid token, 403 if role is not admin.
 */
@Injectable()
export class AdminJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('Token inválido o ausente');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('Acceso restringido a administradores');
    }
    return user;
  }
}
