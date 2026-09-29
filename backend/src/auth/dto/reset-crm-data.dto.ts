import { IsString, MaxLength } from "class-validator";

export class ResetCrmDataDto {
  @IsString()
  @MaxLength(200)
  password!: string;

  @IsString()
  @MaxLength(40)
  confirmation!: string;
}
