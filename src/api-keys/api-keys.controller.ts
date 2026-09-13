import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api/keys')
@UseGuards(AdminGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key — returns raw key once, never retrievable again' })
  @ApiResponse({ status: 201, description: 'Key created, raw key returned once' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin token' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys — hashed keys never returned' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin token' })
  findAll() {
    return this.apiKeysService.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key — sets isActive to false, preserves audit trail' })
  @ApiResponse({ status: 200, description: 'Key revoked' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin token' })
  @ApiResponse({ status: 404, description: 'Key not found' })
  revoke(@Param('id') id: string) {
    return this.apiKeysService.revoke(id);
  }
}
