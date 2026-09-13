import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { AdminGuard } from '../common/guards/admin.guard';
import { JobsService } from './jobs.service';

@Controller('api/jobs')
@UseGuards(AdminGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
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
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }
}
