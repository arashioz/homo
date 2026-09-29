import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Model } from "mongoose";
import { JwtAuthGuard, type AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { Req } from "@nestjs/common";
import { Customer, Lead, Project, Task } from "./crm.schemas";

@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CrmController {
  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<Customer>,
    @InjectModel(Lead.name) private readonly leads: Model<Lead>,
    @InjectModel(Project.name) private readonly projects: Model<Project>,
    @InjectModel(Task.name) private readonly tasks: Model<Task>,
  ) {}

  @Get("leads") @RequirePermissions("lead.read") async listLeads(@Req() req: AuthenticatedRequest) {
    const scoped = req.user?.roles.includes("SALES") ? { assignedSalesId: req.user.sub } : {};
    return { success: true, data: await this.leads.find(scoped).sort({ createdAt: -1 }).limit(300) };
  }
  @Post("leads") @RequirePermissions("lead.create") async createLead(@Body() body: Partial<Lead>, @Req() req: AuthenticatedRequest) {
    const assignedSalesId = body.assignedSalesId ?? (req.user?.roles.includes("SALES") ? req.user.sub : undefined);
    return { success: true, data: await this.leads.create({ ...body, assignedSalesId }) };
  }
  @Patch("leads/:id") @RequirePermissions("lead.update") async updateLead(@Param("id") id: string, @Body() body: Partial<Lead>) {
    return { success: true, data: await this.leads.findByIdAndUpdate(id, body, { new: true, runValidators: true }) };
  }
  @Post("leads/:id/follow-ups") @RequirePermissions("lead.update") async addFollowUp(@Param("id") id: string, @Body() body: { dueAt?: string; note?: string }) {
    if (!body.dueAt) throw new NotFoundException("زمان پیگیری لازم است");
    const lead = await this.leads.findByIdAndUpdate(id, { $push: { followUps: { dueAt: new Date(body.dueAt), note: body.note, status: "PENDING" } } }, { new: true, runValidators: true });
    if (!lead) throw new NotFoundException("لید پیدا نشد");
    return { success: true, data: lead };
  }
  @Patch("leads/:id/follow-ups/:followUpId") @RequirePermissions("lead.update") async completeFollowUp(@Param("id") id: string, @Param("followUpId") followUpId: string) {
    const lead = await this.leads.findOneAndUpdate({ _id: id, "followUps._id": followUpId }, { $set: { "followUps.$.status": "DONE", "followUps.$.completedAt": new Date() } }, { new: true });
    if (!lead) throw new NotFoundException("پیگیری پیدا نشد");
    return { success: true, data: lead };
  }

  @Get("customers") @RequirePermissions("customer.read") async listCustomers(@Req() req: AuthenticatedRequest) { const scoped = req.user?.roles.includes("SALES") ? { assignedSalesId: req.user.sub } : {}; return { success: true, data: await this.customers.find(scoped).sort({ createdAt: -1 }).limit(100) }; }
  @Post("customers") @RequirePermissions("customer.create") async createCustomer(@Body() body: Partial<Customer>) { return { success: true, data: await this.customers.create(body) }; }
  @Patch("customers/:id") @RequirePermissions("customer.update") async updateCustomer(@Param("id") id: string, @Body() body: Partial<Customer>) { return { success: true, data: await this.customers.findByIdAndUpdate(id, body, { new: true, runValidators: true }) }; }

  @Get("projects") @RequirePermissions("project.read") async listProjects(@Req() req: AuthenticatedRequest) { const scoped = req.user?.roles.includes("PROJECT_MANAGER") ? { managerId: req.user.sub } : {}; return { success: true, data: await this.projects.find(scoped).sort({ createdAt: -1 }).limit(100) }; }
  @Post("projects") async createProject(@Body() body: Partial<Project>) { const code = body.code || `PRJ-${Date.now()}`; return { success: true, data: await this.projects.create({ ...body, code }) }; }
  @Patch("projects/:id") async updateProject(@Param("id") id: string, @Body() body: Partial<Project>) { return { success: true, data: await this.projects.findByIdAndUpdate(id, body, { new: true, runValidators: true }) }; }

  @Get("tasks") @RequirePermissions("task.read") async listTasks(@Req() req: AuthenticatedRequest) {
    const scoped = req.user?.roles.includes("PROJECT_MANAGER") ? { assigneeId: req.user.sub } : {};
    return { success: true, data: await this.tasks.find(scoped).sort({ dueAt: 1, createdAt: -1 }).limit(200) };
  }
  @Post("tasks") async createTask(@Body() body: Partial<Task>) { return { success: true, data: await this.tasks.create(body) }; }
  @Patch("tasks/:id") async updateTask(@Param("id") id: string, @Body() body: Partial<Task>) { return { success: true, data: await this.tasks.findByIdAndUpdate(id, body, { new: true, runValidators: true }) }; }
  @Patch("tasks/:id/checklist/:index") async check(@Param("id") id: string, @Param("index") index: string) {
    const task = await this.tasks.findById(id); if (!task) throw new NotFoundException("تسک پیدا نشد");
    const item = task.checklist[Number(index)]; if (!item) throw new NotFoundException("آیتم چک‌لیست پیدا نشد");
    item.checked = !item.checked; await task.save(); return { success: true, data: task };
  }
}
