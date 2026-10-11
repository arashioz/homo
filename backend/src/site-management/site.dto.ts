import { Type } from "class-transformer";
import { Allow, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf } from "class-validator";

export class ProductBodyDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() specs?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsNumber() @Type(() => Number) price?: number | null;
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsString() priceLabel?: string | null;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() protocol?: string | null;
  @IsOptional() @IsString() image?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) colors?: string[];
}

export class GuideBodyDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) readMinutes?: number;
  @IsOptional() @Allow() body?: string | string[];
  @IsOptional() @IsIn(["draft", "published"]) status?: "draft" | "published";
}

export class PortfolioBodyDto {
  @IsString() title!: string;
  @IsOptional() @IsString() location?: string;
  @IsString() description!: string;
  @IsOptional() @IsString() image?: string;
}

export class ShopSettingsDto {
  @IsOptional() @IsIn(["ONLINE", "WHATSAPP"]) checkoutMode?: "ONLINE" | "WHATSAPP";
  @IsOptional() @IsString() paymentGatewayUrl?: string;
  @IsOptional() @IsString() whatsappPhone?: string;
}

export class OrderStatusDto {
  @IsIn(["new", "confirmed", "done", "cancelled"]) status!: "new" | "confirmed" | "done" | "cancelled";
}

export class CatalogCronDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) intervalMinutes?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) durationMinutes?: number;
}
