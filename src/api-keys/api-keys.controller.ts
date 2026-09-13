import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api/keys')
@UseGuards(AdminGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(dto);
  }

  @Get()
  findAll() {
    return this.apiKeysService.findAll();
  }

  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.apiKeysService.revoke(id);
  }
}
