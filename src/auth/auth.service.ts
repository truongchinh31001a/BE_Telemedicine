import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('UserRole') private readonly userRoleModel: Model<any>,
    @InjectModel('Role') private readonly roleModel: Model<any>,
    @InjectModel('UserProfile') private readonly userProfileModel: Model<any>,
    @InjectModel('AuthSession') private readonly authSessionModel: Model<any>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(identifier: string, password: string) {
    const user = await this.userModel
      .findOne({
        $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
      })
      .lean();

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordSha256 = createHash('sha256').update(password).digest('hex');
    const matched = user.password_hash === password || user.password_hash === passwordSha256;
    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roleNames = await this.getRoleNamesByUserId(user._id);
    const issued = await this.issueTokensAndSession(user, roleNames);
    return issued.response;
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const userId = payload.sub ?? '';
    const sessionId = payload.sid ?? '';

    if (!userId || !sessionId || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const existingSession = await this.authSessionModel.findOne({
      user_id: userId,
      session_id: sessionId,
      revoked_at: null,
    });

    if (!existingSession) {
      throw new UnauthorizedException('Refresh session not found');
    }

    if (new Date(existingSession.expires_at).getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (existingSession.token_hash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.userModel.findById(userId).lean();
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User inactive');
    }

    const roleNames = await this.getRoleNamesByUserId(user._id);
    const issued = await this.issueTokensAndSession(user, roleNames);

    await this.authSessionModel.updateOne(
      { _id: existingSession._id, revoked_at: null },
      {
        $set: {
          revoked_at: new Date(),
          replaced_by_session_id: issued.sessionId,
        },
      },
    );

    return issued.response;
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      const userId = payload.sub ?? '';
      const sessionId = payload.sid ?? '';

      if (!userId || !sessionId) {
        return { success: true };
      }

      await this.authSessionModel.updateOne(
        {
          user_id: userId,
          session_id: sessionId,
          token_hash: this.hashToken(refreshToken),
          revoked_at: null,
        },
        { $set: { revoked_at: new Date() } },
      );
    } catch {
      return { success: true };
    }

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new UnauthorizedException('User not found');

    const userRoles = await this.userRoleModel.find({ user_id: user._id }).lean();
    const roleIds = userRoles.map((item: any) => item.role_id);
    const roles = await this.roleModel.find({ _id: { $in: roleIds } }).lean();
    const profile = await this.userProfileModel.findOne({ user_id: user._id }).lean();

    return {
      userId: String(user._id),
      username: user.username,
      email: user.email,
      isActive: user.is_active,
      roles: roles.map((item: any) => item.role_name),
      fullName: profile?.full_name ?? '',
      image: profile?.image_url ?? '',
    };
  }

  private async getRoleNamesByUserId(userId: unknown): Promise<string[]> {
    const userRoles = await this.userRoleModel.find({ user_id: userId }).lean();
    const roleIds = userRoles.map((item: any) => item.role_id);
    const roles = await this.roleModel.find({ _id: { $in: roleIds } }).lean();
    return roles.map((item: any) => item.role_name);
  }

  private async issueTokensAndSession(user: any, roleNames: string[]) {
    const userId = String(user._id);
    const sessionId = randomUUID();
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const accessExpiresInSeconds = this.parseDurationToSeconds(accessExpiresIn);
    const refreshExpiresInSeconds = this.parseDurationToSeconds(refreshExpiresIn);
    const accessSecret = this.configService.get<string>('JWT_SECRET') ?? 'telemedicine-secret';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? `${accessSecret}-refresh`;

    const accessPayload = {
      sub: userId,
      username: user.username,
      email: user.email,
      roles: roleNames,
      type: 'access',
    };

    const refreshPayload = {
      sub: userId,
      sid: sessionId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresInSeconds,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresInSeconds,
      }),
    ]);

    const refreshExpiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    await this.authSessionModel.create({
      user_id: userId,
      session_id: sessionId,
      token_hash: this.hashToken(refreshToken),
      expires_at: refreshExpiresAt,
      revoked_at: null,
    });

    return {
      sessionId,
      response: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: accessExpiresIn,
        accessTokenExpiresIn: accessExpiresIn,
        refreshTokenExpiresIn: refreshExpiresIn,
        user: {
          userId,
          username: user.username,
          email: user.email,
          roles: roleNames,
        },
      },
    };
  }

  private async verifyRefreshToken(token: string) {
    const accessSecret = this.configService.get<string>('JWT_SECRET') ?? 'telemedicine-secret';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? `${accessSecret}-refresh`;

    try {
      return await this.jwtService.verifyAsync<Record<string, string>>(token, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationToMs(value: string): number {
    const normalized = (value ?? '').trim();
    const match = normalized.match(/^(\d+)([smhd])$/i);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 's') return amount * 1000;
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
  }

  private parseDurationToSeconds(value: string): number {
    return Math.floor(this.parseDurationToMs(value) / 1000);
  }
}
