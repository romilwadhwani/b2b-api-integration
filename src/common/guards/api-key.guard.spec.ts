import { jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../../database/prisma.service';

const RAW_KEY = 'bk_live_testkey123';
const HASHED_KEY = createHash('sha256').update(RAW_KEY).digest('hex');

const mockPrisma = {
  apiKey: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

function mockContext(apiKeyHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = {
    headers: apiKeyHeader ? { 'x-api-key': apiKeyHeader } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    jest.clearAllMocks();
    mockPrisma.apiKey.update.mockResolvedValue({});
  });

  it('should return true and trigger lastUsedAt update for a valid active key', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1', hashedKey: HASHED_KEY, isActive: true, expiresAt: null,
    });

    const ctx = mockContext(RAW_KEY);
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastUsedAt: expect.any(Date) } }),
    );
  });

  it('should throw UnauthorizedException when x-api-key header is missing', async () => {
    const ctx = mockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when key is not found in DB', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null);
    const ctx = mockContext(RAW_KEY);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when isActive is false', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1', hashedKey: HASHED_KEY, isActive: false, expiresAt: null,
    });
    const ctx = mockContext(RAW_KEY);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when key is expired', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1', hashedKey: HASHED_KEY, isActive: true,
      expiresAt: new Date('2020-01-01'),
    });
    const ctx = mockContext(RAW_KEY);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
