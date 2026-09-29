import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: "users" })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  username!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ type: [String], default: ["SUPER_ADMIN"] })
  roles!: string[];

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ default: true })
  active!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
