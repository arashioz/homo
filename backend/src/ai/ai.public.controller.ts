import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";
import { AiOrchestratorService } from "./ai.orchestrator.service";

class PublicCustomerChatDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

@ApiTags("public-ai")
@Controller("public/ai")
export class AiPublicController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Get("status")
  async getStatus() {
    const settings = await this.orchestrator.getSettings();
    return {
      success: true,
      data: {
        customerSupportEnabled: settings.customerSupportEnabled,
        provider: settings.provider,
        model: settings.model,
      },
    };
  }

  @Post("customer-chat")
  async chat(@Body() dto: PublicCustomerChatDto) {
    const result = await this.orchestrator.customerChat({
      message: dto.message,
      history: dto.history,
    });
    return { success: true, data: result };
  }
}
