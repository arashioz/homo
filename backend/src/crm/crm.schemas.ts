import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true, collection: "customers" })
export class Customer {
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ trim: true, index: true }) mobile?: string;
  @Prop({ trim: true }) companyName?: string;
  @Prop({ default: "ACTIVE", index: true }) status!: string;
  @Prop({ trim: true }) source?: string;
  @Prop({ type: Types.ObjectId }) assignedSalesId?: Types.ObjectId;
  @Prop() nextFollowUpAt?: Date;
  @Prop() notes?: string;
}
export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ status: 1, nextFollowUpAt: 1 });

@Schema({ _id: false, timestamps: true })
export class LeadFollowUp {
  @Prop({ required: true }) dueAt!: Date;
  @Prop({ default: "PENDING", index: true }) status!: string;
  @Prop({ trim: true }) note?: string;
  @Prop() completedAt?: Date;
}
const LeadFollowUpSchema = SchemaFactory.createForClass(LeadFollowUp);

@Schema({ timestamps: true, collection: "leads" })
export class Lead {
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ trim: true, index: true }) mobile?: string;
  @Prop({ trim: true }) companyName?: string;
  @Prop({ default: "OTHER", index: true }) source!: string;
  @Prop({ default: "NEW", index: true }) stage!: string;
  @Prop({ type: Types.ObjectId }) assignedSalesId?: Types.ObjectId;
  @Prop({ trim: true }) notes?: string;
  @Prop({ type: [LeadFollowUpSchema], default: [] }) followUps!: LeadFollowUp[];
}
export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ stage: 1, source: 1, createdAt: -1 });
LeadSchema.index({ assignedSalesId: 1, createdAt: -1 });

@Schema({ timestamps: true, collection: "projects" })
export class Project {
  @Prop({ required: true, unique: true }) code!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ type: Types.ObjectId, ref: Customer.name, required: true }) customerId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId }) managerId?: Types.ObjectId;
  @Prop({ default: "DRAFT", index: true }) status!: string;
  @Prop({ default: 0, min: 0, max: 100 }) progress!: number;
  @Prop() targetEndDate?: Date;
  @Prop({ trim: true }) protocol?: string;
  @Prop({ trim: true }) projectColor?: string;
  @Prop() description?: string;
}
export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ customerId: 1, status: 1 });

@Schema({ _id: false })
export class ChecklistItem {
  @Prop({ required: true }) title!: string;
  @Prop({ default: false }) checked!: boolean;
}
const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

@Schema({ timestamps: true, collection: "tasks" })
export class Task {
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ type: Types.ObjectId, ref: Project.name }) projectId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId }) assigneeId?: Types.ObjectId;
  @Prop({ default: "TODO", index: true }) status!: string;
  @Prop({ default: "MEDIUM" }) priority!: string;
  @Prop() dueAt?: Date;
  @Prop({ type: [ChecklistItemSchema], default: [] }) checklist!: ChecklistItem[];
}
export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ assigneeId: 1, status: 1, dueAt: 1 });
