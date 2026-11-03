import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { getPrismaClient } from '@visapilot/database';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly db = getPrismaClient();
  private readonly refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(private readonly jwtService: JwtService) { }

  async register(params: { email: string; password: string; name: string }) {
    const { email, password, name } = params;

    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.db.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: name || email.split('@')[0],
        role: 'USER',
      },
    });

    this.logger.log(`User registered: ${email}`);

    return this.generateTokens(user);
  }

  async login(params: { email: string; password: string }) {
    const { email, password } = params;

    // Validate demo credentials or standard credentials
    if (email === 'demo@visapilot.ai' && password === 'demo1234') {
      // Find or create demo user
      let demoUser = await this.db.user.findUnique({ where: { email } });
      if (!demoUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        demoUser = await this.db.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            name: 'Demo User',
            role: 'USER',
          },
        });
      }
      return this.generateTokens(demoUser);
    }

    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Invalid email or password');
      }
      // In dev, auto-create user on first login
      const hashedPassword = await bcrypt.hash(password || 'demo1234', 10);
      const newUser = await this.db.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name: email.split('@')[0],
          role: 'USER',
        },
      });
      return this.generateTokens(newUser);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch && process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Invalid email or password');
    }

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

