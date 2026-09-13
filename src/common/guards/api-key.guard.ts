import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const rawKey = req.headers['x-api-key'];

    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('x-api-key header is missing');
    }

    const hashedKey = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { hashedKey },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => null);

    (req as Request & { apiKey: typeof apiKey }).apiKey = apiKey;

    return true;
  }
}
