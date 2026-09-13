import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface JobFilters {
  status?: JobStatus;
  limit?: number;
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: JobFilters = {}) {
    const limit = Math.min(filters.limit ?? 50, 100);

    return this.prisma.jobLog.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        event: true,
        status: true,
        attempts: true,
        error: true,
        completedAt: true,
        createdAt: true,
        apiKeyId: true,
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.jobLog.findUnique({
      where: { id },
      include: {
        apiKey: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with id ${id} not found`);
    }

    return job;
  }
}
