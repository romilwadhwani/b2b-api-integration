import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  apiKey: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should return a raw key with bk_live_ prefix', async () => {
      const fakeRecord = {
        id: 'cuid1',
        name: 'Test Key',
        hashedKey: 'somehash',
        expiresAt: null,
        createdAt: new Date(),
      };
      mockPrisma.apiKey.create.mockResolvedValue(fakeRecord);

      const result = await service.create({ name: 'Test Key' });

      expect(result.key).toMatch(/^bk_live_/);
    });

    it('should never store the raw key — stored hash must differ from raw key', async () => {
      let capturedHashedKey = '';
      mockPrisma.apiKey.create.mockImplementation(({ data }) => {
        capturedHashedKey = data.hashedKey;
        return Promise.resolve({ id: 'cuid1', name: data.name, hashedKey: data.hashedKey, expiresAt: null, createdAt: new Date() });
      });

      const result = await service.create({ name: 'Test Key' });

      expect(capturedHashedKey).not.toBe(result.key);
      expect(capturedHashedKey).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('should call prisma.apiKey.create with the hash, not the raw key', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'cuid1', name: 'Test Key', hashedKey: 'hash', expiresAt: null, createdAt: new Date(),
      });

      await service.create({ name: 'Test Key' });

      const callArg = mockPrisma.apiKey.create.mock.calls[0][0].data;
      expect(callArg.hashedKey).toBeDefined();
      expect(callArg.hashedKey).not.toMatch(/^bk_live_/);
    });
  });

  describe('revoke()', () => {
    it('should call prisma.apiKey.update with isActive: false', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({ id: 'cuid1', name: 'Test' });
      mockPrisma.apiKey.update.mockResolvedValue({ id: 'cuid1', name: 'Test', isActive: false, createdAt: new Date() });

      await service.revoke('cuid1');

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });
});
