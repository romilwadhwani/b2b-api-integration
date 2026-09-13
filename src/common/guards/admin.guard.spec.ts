import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from './admin.guard';

const SECRET = 'test-secret-abc123';

function mockContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authHeader ? { authorization: authHeader } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: ConfigService,
          useValue: { get: () => SECRET },
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
  });

  it('should return true for a valid Bearer token', () => {
    const ctx = mockContext(`Bearer ${SECRET}`);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw UnauthorizedException when Authorization header is missing', () => {
    const ctx = mockContext();
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for a wrong token', () => {
    const ctx = mockContext('Bearer wrong-token');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for malformed header (no Bearer scheme)', () => {
    const ctx = mockContext(SECRET);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
