import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { Connection, Model } from "mongoose";
import { LoginDto } from "./dto/login.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateProjectManagerDto } from "./dto/update-project-manager.dto";
import { PROJECT_MANAGER_PERMISSIONS } from "./role-permissions";
import { User, type UserDocument } from "./user.schema";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async login(input: LoginDto) {
    const user = await this.users.findOne({ username: input.username.toLowerCase(), active: true });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("نام کاربری یا رمز عبور نادرست است");
    }
    return this.issue(user);
  }

  async bootstrapAdmin(): Promise<void> {
    const username = process.env.CRM_ADMIN_USERNAME?.trim().toLowerCase();
    const password = process.env.CRM_ADMIN_PASSWORD;
    if (!username || !password || password.startsWith("replace-with")) return;
    const existing = await this.users.exists({ username });
    if (existing) return;
    await this.users.create({
      username,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: "مدیر سیستم",
      roles: ["SUPER_ADMIN"],
      permissions: ["*"],
      active: true,
    });
  }

  async listUsers(role?: string) {
    const filter = role ? { roles: role } : { active: true };
    return this.users.find(filter).select("username fullName roles active createdAt").sort({ fullName: 1 }).lean();
  }

  async createUser(input: CreateUserDto) {
    const username = input.username.trim().toLowerCase();
    if (await this.users.exists({ username })) throw new ConflictException("این نام کاربری قبلاً ثبت شده است");
    const roles = input.roles?.length ? input.roles : ["PROJECT_MANAGER"];
    const permissions = roles.includes("PROJECT_MANAGER") ? PROJECT_MANAGER_PERMISSIONS : [];
    const user = await this.users.create({
      username,
      passwordHash: await bcrypt.hash(input.password, 12),
      fullName: input.fullName.trim(),
      roles,
      permissions,
      active: input.active ?? true,
    });
    return { id: user.id, username: user.username, fullName: user.fullName, roles: user.roles, active: user.active };
  }

  async updateProjectManager(id: string, input: UpdateProjectManagerDto) {
    const user = await this.users.findById(id);
    if (!user || !user.roles.includes("PROJECT_MANAGER")) {
      throw new NotFoundException("مدیر پروژه پیدا نشد");
    }

    if (input.username !== undefined) {
      const username = input.username.trim().toLowerCase();
      const duplicate = await this.users.exists({ username, _id: { $ne: user._id } });
      if (duplicate) throw new ConflictException("این نام کاربری قبلاً ثبت شده است");
      user.username = username;
    }
    if (input.fullName !== undefined) user.fullName = input.fullName.trim();
    if (input.password) user.passwordHash = await bcrypt.hash(input.password, 12);
    if (input.active !== undefined) user.active = input.active;

    await user.save();
    return { id: user.id, username: user.username, fullName: user.fullName, roles: user.roles, active: user.active };
  }

  /** Clears operational CRM records while retaining every login account. */
  async resetCrmData(actorId: string, password: string, confirmation: string) {
    if (confirmation.trim() !== "حذف کامل CRM") {
      throw new UnauthorizedException("عبارت تأیید باید دقیقاً «حذف کامل CRM» باشد");
    }
    const actor = await this.users.findById(actorId);
    if (!actor || !actor.active || !actor.roles.includes("SUPER_ADMIN") || !(await bcrypt.compare(password, actor.passwordHash))) {
      throw new UnauthorizedException("رمز مدیر سیستم نادرست است");
    }

    const collections = ["customers", "projects", "tasks", "invoices", "payments", "expenses", "purchaseinvoices", "ledgerentries", "activitylogs", "counters"];
    const existing = new Set((await this.connection.db!.listCollections().toArray()).map((collection) => collection.name));
    const deleted: Record<string, number> = {};
    for (const name of collections) {
      if (!existing.has(name)) continue;
      deleted[name] = (await this.connection.db!.collection(name).deleteMany({})).deletedCount ?? 0;
    }
    return { deleted };
  }

  private async issue(user: UserDocument) {
    const permissions = user.roles.includes("PROJECT_MANAGER")
      ? Array.from(new Set([...user.permissions, ...PROJECT_MANAGER_PERMISSIONS]))
      : user.permissions;
    const payload = { sub: user.id, roles: user.roles, permissions };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, username: user.username, fullName: user.fullName, roles: user.roles },
    };
  }
}
