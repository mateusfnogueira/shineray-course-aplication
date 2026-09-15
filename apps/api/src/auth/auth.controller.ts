import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AcceptLegalDocumentDto } from './dto/accept-legal-document.dto';
import {
  AuthResponseDto,
  PendingLegalDocumentDto,
  RefreshResponseDto,
  UserProfileDto,
} from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '@compliance/shared';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_COOKIE = 'access_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive tokens' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto.email,
      dto.password,
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );

    this.setTokenCookies(res, accessToken, refreshToken);
    return { accessToken, user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const rawRefreshToken = (req.cookies as Record<string, string>)?.[REFRESH_TOKEN_COOKIE];

    if (!rawRefreshToken) {
      throw new UnauthorizedException('Sessão não encontrada');
    }

    const { accessToken, refreshToken } = await this.authService.refresh(rawRefreshToken);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke current session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawRefreshToken = (req.cookies as Record<string, string>)?.[REFRESH_TOKEN_COOKIE];

    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }

    this.clearTokenCookies(res);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using one-time token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post('activate-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate account using invitation token (auto-login)' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async activateAccount(
    @Body() dto: ActivateAccountDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } = await this.authService.activateAccount(
      dto.token,
      dto.password,
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );

    this.setTokenCookies(res, accessToken, refreshToken);
    return { accessToken, user };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserProfileDto> {
    return this.authService.getMe(user.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    // All sessions revoked — clear cookies
    this.clearTokenCookies(res);
  }

  @Get('pending-legal-documents')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active legal documents pending user acceptance' })
  @ApiResponse({ status: 200, type: [PendingLegalDocumentDto] })
  async getPendingLegalDocuments(
    @CurrentUser() user: JwtPayload,
  ): Promise<PendingLegalDocumentDto[]> {
    return this.authService.getPendingLegalDocuments(user.sub);
  }

  @Post('accept-legal-document')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Accept a legal document (idempotent)' })
  async acceptLegalDocument(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AcceptLegalDocumentDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.acceptLegalDocument(
      user.sub,
      dto.legalDocumentId,
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );
  }

  // ─── Cookie helpers ──────────────────────────────────────────────────────────

  private cookieDefaults(): CookieOptions {
    const isProd = process.env['NODE_ENV'] === 'production';
    return {
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
    };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const base = this.cookieDefaults();

    // httpOnly refresh token — only sent to auth endpoints
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...base,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    // Non-httpOnly access token — readable by Next.js middleware
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...base,
      httpOnly: false,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
  }

  private clearTokenCookies(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  }
}
