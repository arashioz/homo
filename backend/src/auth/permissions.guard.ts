import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { PROJECT_MANAGER_PERMISSIONS, SALES_PERMISSIONS } from "./role-permissions";
import type { AuthenticatedRequest } from "./jwt-auth.guard";

const projectManagerPermissionSet = new Set(PROJECT_MANAGER_PERMISSIONS);
const salesPermissionSet = new Set(SALES_PERMISSIONS);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (user?.permissions.includes("*") || user?.roles.includes("ADMIN") || required.every((permission) => user?.permissions.includes(permission))) return true;
    if (user?.roles.includes("PROJECT_MANAGER") && required.every((permission) => projectManagerPermissionSet.has(permission))) return true;
    if (user?.roles.includes("SALES") && required.every((permission) => salesPermissionSet.has(permission))) return true;
    throw new ForbiddenException("دسترسی لازم برای این عملیات را ندارید");
  }
}
