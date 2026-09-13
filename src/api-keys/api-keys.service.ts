import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApiKeyDto) {
    const rawKey = `bk_live_${randomBytes(32).toString('hex')}`;
    const hashedKey = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        hashedKey,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      message: 'Store this key securely — it will never be shown again.',
    };
  }

  async findAll() {
    return this.prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`API key with id ${id} not found`);
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
