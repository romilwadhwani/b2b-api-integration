import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import { AdminGuard } from '../common/guards/admin.guard';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('api/jobs')
@UseGuards(AdminGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List all job logs with optional status filter and limit' })
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Default 50, max 100' })
  @ApiResponse({ status: 200, description: 'List of job logs' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin token' })
  findAll(
    @Query('status') status?: JobStatus,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.findAll({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job log by ID including linked API key info' })
  @ApiResponse({ status: 200, description: 'Job log detail' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin token' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }
}
