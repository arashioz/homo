import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateProjectManagerDto } from "./dto/update-project-manager.dto";
import { ResetCrmDataDto } from "./dto/reset-crm-data.dto";
import { JwtAuthGuard, type AuthenticatedRequest } from "./jwt-auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { RequirePermissions } from "./permissions.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto) {
    return { success: true, data: await this.auth.login(dto) };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() request: AuthenticatedRequest) {
    return { success: true, data: request.user };
  }

  @Get("users")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user.read")
  @ApiBearerAuth()
  async users(@Query("role") role?: string) {
    return { success: true, data: await this.auth.listUsers(role) };
  }

  @Post("users")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user.manage")
  @ApiBearerAuth()
  async createUser(@Body() dto: CreateUserDto) {
    return { success: true, data: await this.auth.createUser(dto) };
  }

  @Patch("users/:id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user.manage")
  @ApiBearerAuth()
  async updateProjectManager(@Param("id") id: string, @Body() dto: UpdateProjectManagerDto) {
    return { success: true, data: await this.auth.updateProjectManager(id, dto) };
  }

  @Post("reset-crm-data")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("*")
  @ApiBearerAuth()
  async resetCrmData(@Body() dto: ResetCrmDataDto, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw new Error("Authenticated request is missing its user");
    return { success: true, data: await this.auth.resetCrmData(request.user.sub, dto.password, dto.confirmation) };
  }
}
