import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: Record<string, string>) {
    const identifier = body.identifier ?? body.username ?? body.email ?? '';
    const password = body.password ?? '';
    return this.authService.login(identifier, password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: Record<string, string>) {
    const refreshToken = body.refreshToken ?? body.refresh_token ?? '';
    return this.authService.refresh(refreshToken);
  }

  @Public()
  @Post('logout')
  logout(@Body() body: Record<string, string>) {
    const refreshToken = body.refreshToken ?? body.refresh_token ?? '';
    return this.authService.logout(refreshToken);
  }

  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.sub);
  }
}
