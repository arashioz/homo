import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProjectManagerDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
