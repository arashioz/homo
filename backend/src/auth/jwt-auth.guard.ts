import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export type AuthenticatedRequest = Request & { user?: { sub: string; roles: string[]; permissions: string[] } };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("ورود لازم است");
    try {
      request.user = await this.jwt.verifyAsync<{ sub: string; roles: string[]; permissions: string[] }>(token);
      return true;
    } catch {
      throw new UnauthorizedException("نشست نامعتبر یا منقضی شده است");
    }
  }
}
