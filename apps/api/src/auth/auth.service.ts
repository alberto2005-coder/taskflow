import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { durationToMs, sha256 } from '../common/utils/token';
import type { AuthUser } from '../common/types/auth-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly refreshTtl: string;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshTtl = this.configService.get<string>('JWT_REFRESH_TTL', '7d');
    this.refreshTtlMs = durationToMs(this.refreshTtl, 7 * 24 * 60 * 60 * 1000);
  }

  /** Registro: crea el usuario con rol MEMBER y abre sesiÃ³n. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('El email ya estÃ¡ registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        role: 'MEMBER',
      },
    });

    return this.createSession(user);
  }

  /** Login: verifica la contraseÃ±a (mensaje genÃ©rico para no filtrar usuarios). */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales invÃ¡lidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales invÃ¡lidas');
    }

    return this.createSession(user);
  }

  /**
   * Rota el refresh token: valida el hash, comprueba caducidad y emite
   * uno nuevo (el anterior deja de ser vÃ¡lido).
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token invÃ¡lido o revocado');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => undefined);
      throw new UnauthorizedException('Refresh token caducado');
    }

    // RotaciÃ³n: se elimina el token usado y se emite uno nuevo
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.createSession(stored.user);
  }

  /** Logout: invalida el refresh token (idempotente). */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }

  /** Usuario autenticado actual (`GET /auth/me`). */
  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  // ---------------------------------------------------------
  // Privados
  // ---------------------------------------------------------

  private async createSession(user: User): Promise<AuthResponse> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });

    return {
      user: this.toPublic(user),
      accessToken,
      refreshToken,
    };
  }

  private toPublic(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
