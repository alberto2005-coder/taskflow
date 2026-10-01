import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { PrismaService } from '../src/prisma/prisma.service';
import { sha256 } from '../src/common/utils/token';
import { AuthService } from '../src/auth/auth.service';

type MockedPrisma = {
  user: { findUnique: jest.Mock; create: jest.Mock };
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
};

const baseUser: User = {
  id: 'user-1',
  email: 'ana@taskflow.dev',
  name: 'Ana',
  passwordHash: bcrypt.hashSync('Secreta123', 4),
  role: Role.MEMBER,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function buildService(): {
  service: AuthService;
  prisma: MockedPrisma;
  jwt: { sign: jest.Mock };
} {
  const prisma: MockedPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    refreshToken: {
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const jwt = { sign: jest.fn().mockReturnValue('access-token') };

  const config = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  } as unknown as ConfigService;

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config,
  );

  return { service, prisma, jwt };
}

describe('AuthService', () => {
  describe('register', () => {
    it('crea el usuario con la contraseÃ±a hasheada y abre sesiÃ³n', async () => {
      const { service, prisma, jwt } = buildService();

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) =>
        Promise.resolve({ ...baseUser, ...data, id: 'user-1' }),
      );

      const result = await service.register({
        name: 'Ana',
        email: '  Ana@Taskflow.dev ',
        password: 'Secreta123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'ana@taskflow.dev' },
      });

      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.email).toBe('ana@taskflow.dev');
      expect(created.role).toBe('MEMBER');
      expect(created.passwordHash).not.toBe('Secreta123');
      expect(bcrypt.compareSync('Secreta123', created.passwordHash)).toBe(true);

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'ana@taskflow.dev',
        name: 'Ana',
        role: Role.MEMBER,
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', role: Role.MEMBER }),
      );
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('rechaza un email ya registrado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.register({ name: 'Ana', email: 'ana@taskflow.dev', password: 'Secreta123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('devuelve la sesiÃ³n con credenciales vÃ¡lidas', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.login({
        email: 'ana@taskflow.dev',
        password: 'Secreta123',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('devuelve el mismo error si el usuario no existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@taskflow.dev', password: 'Secreta123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('devuelve el mismo error si la contraseÃ±a es incorrecta', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.login({ email: 'ana@taskflow.dev', password: 'otra-contraseÃ±a' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const validToken = 'a'.repeat(96);

    it('rota el refresh token y emite uno nuevo', async () => {
      const { service, prisma } = buildService();

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: sha256(validToken),
        expiresAt: new Date(Date.now() + 60_000),
        user: baseUser,
      });

      const result = await service.refresh(validToken);

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256(validToken) },
        include: { user: true },
      });
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).not.toBe(validToken);
    });

    it('rechaza un token desconocido (revocado o falso)', async () => {
      const { service, prisma } = buildService();
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(validToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('borra y rechaza un token caducado', async () => {
      const { service, prisma } = buildService();

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-2',
        tokenHash: sha256(validToken),
        expiresAt: new Date(Date.now() - 1000),
        user: baseUser,
      });

      await expect(service.refresh(validToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-2' } });
    });
  });

  describe('logout', () => {
    it('revoca el refresh token almacenado', async () => {
      const { service, prisma } = buildService();
      const token = 'b'.repeat(96);

      await service.logout(token);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: sha256(token) },
      });
    });
  });

  describe('me', () => {
    it('devuelve el usuario autenticado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({
        id: baseUser.id,
        email: baseUser.email,
        name: baseUser.name,
        role: baseUser.role,
      });

      await expect(service.me('user-1')).resolves.toEqual({
        id: 'user-1',
        email: 'ana@taskflow.dev',
        name: 'Ana',
        role: Role.MEMBER,
      });
    });

    it('lanza 404 si la cuenta ya no existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
