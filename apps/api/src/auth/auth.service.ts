import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(private readonly jwtService: JwtService) { }

  async register(params: { email: string; password: string; name: string }) {
    const { email, password, name } = params;

    // In production, use the UserRepository from @visapilot/database
    const hashedPassword = await bcrypt.hash(password, 12);

    // Mock user creation - replace with Prisma call
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      role: 'USER',
      createdAt: new Date(),
    };

    this.logger.log(`User registered: ${email}`);

    return this.generateTokens(user);
  }

  async login(params: { email: string; password: string }) {
    const { email, password } = params;

    // Mock validation - replace with Prisma call
    if (email !== 'demo@visapilot.ai' || password !== 'demo1234') {
      // For demo purposes, allow any login in development
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Invalid email or password');
      }
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      name: email.split('@')[0],
      role: 'USER',
    };

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string) {
    const stored = this.refreshTokens.get(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = {
      id: stored.userId,
      email: 'user@visapilot.ai',
      role: 'USER',
    };

    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    // Remove all refresh tokens for user
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
    this.logger.log(`User logged out: ${userId}`);
  }

  async getProfile(userId: string) {
    // Replace with Prisma query
    return {
      id: userId,
      email: 'user@visapilot.ai',
      name: 'Demo User',
      role: 'USER',
      skills: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS'],
      experience: [
        {
          company: 'Tech Corp',
          title: 'Senior Engineer',
          startDate: '2020-01-01',
          current: true,
        },
      ],
    };
  }

  private generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomUUID();

    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // ~100 years (never expire)
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 100 * 365 * 24 * 60 * 60, // ~100 years in seconds (never expire)
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: emailToName(user.email),
      },
    };
  }
}

function emailToName(email: string): string {
  return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

