import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ timestamps: true, collection: "site_products" })
export class SiteProduct {
  @Prop({ required: true, unique: true, index: true }) legacyId!: number;
  @Prop({ required: true, trim: true, index: true }) title!: string;
  @Prop({ required: true, trim: true, index: true }) category!: string;
  @Prop({ required: true, trim: true }) specs!: string;
  @Prop() description?: string;
  @Prop({ type: [String], default: [] }) features!: string[];
  @Prop({ type: Number, default: null, min: 0 }) price!: number | null;
  @Prop() priceLabel?: string;
  @Prop() protocol?: string;
  @Prop({ type: [String], default: [] }) colors!: string[];
  @Prop() image?: string;
  @Prop({ type: [String], default: [] }) images!: string[];
  @Prop({ type: Object, default: {} }) colorImages?: Record<string, string>;
  @Prop({ default: true, index: true }) isPublished!: boolean;
}
export type SiteProductDocument = HydratedDocument<SiteProduct>;
export const SiteProductSchema = SchemaFactory.createForClass(SiteProduct);
SiteProductSchema.index({ category: 1, isPublished: 1, title: 1 });

@Schema({ timestamps: true, collection: "site_portfolio_projects" })
export class SitePortfolioProject {
  @Prop({ required: true, unique: true, index: true }) legacyId!: string;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop() location?: string;
  @Prop({ required: true }) description!: string;
  @Prop() image?: string;
  @Prop({ default: true, index: true }) isPublished!: boolean;
}
export const SitePortfolioProjectSchema = SchemaFactory.createForClass(SitePortfolioProject);

@Schema({ timestamps: true, collection: "site_settings" })
export class SiteSettings {
  @Prop({ required: true, unique: true, default: "shop" }) key!: string;
  @Prop({ default: "WHATSAPP" }) checkoutMode!: "ONLINE" | "WHATSAPP";
  @Prop({ default: "" }) paymentGatewayUrl!: string;
  @Prop({ default: "989356544158" }) whatsappPhone!: string;
}
export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);

@Schema({ _id: false })
export class SiteOrderLine {
  @Prop({ required: true }) legacyProductId!: number;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true, min: 0 }) price!: number;
  @Prop({ required: true, min: 1 }) qty!: number;
}
const SiteOrderLineSchema = SchemaFactory.createForClass(SiteOrderLine);

@Schema({ timestamps: true, collection: "site_orders" })
export class SiteOrder {
  @Prop({ required: true, unique: true, index: true }) legacyId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, index: true }) phone!: string;
  @Prop({ required: true }) address!: string;
  @Prop() note?: string;
  @Prop({ type: [SiteOrderLineSchema], default: [] }) lines!: SiteOrderLine[];
  @Prop({ required: true, min: 0 }) total!: number;
  @Prop({ default: "new", index: true }) status!: "new" | "confirmed" | "done" | "cancelled";
  @Prop() orderedAt!: Date;
}
export const SiteOrderSchema = SchemaFactory.createForClass(SiteOrder);
