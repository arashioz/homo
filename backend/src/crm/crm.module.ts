import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { CrmController } from "./crm.controller";
import { Customer, CustomerSchema, Lead, LeadSchema, Project, ProjectSchema, Task, TaskSchema } from "./crm.schemas";

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }, { name: Lead.name, schema: LeadSchema }, { name: Project.name, schema: ProjectSchema }, { name: Task.name, schema: TaskSchema }])],
  controllers: [CrmController],
})
export class CrmModule {}
