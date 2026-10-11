import { REFRESH_TOKEN_TTL_DAYS } from '@bazaar/contracts';
import {
  ApiZodBody,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  Public,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { RateLimit } from '../../../common/decorators/rate-limit.decorator.js';
import { AppConfig } from '../../../config/app-config.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../../../constants/auth.constant.js';
import { RateLimitPolicy } from '../../../enums/rate-limit-policy.enum.js';
import type { IssuedSession } from '../../../interfaces/session.interface.js';
import { type UserResponse, userResponseSchema } from '../../users/dto/user-response.dto.js';
import { UserMapper } from '../../users/mappers/user.mapper.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import {
  type EmailOnlyDto,
  emailOnlySchema,
  type LoginDto,
  loginSchema,
  type RegisterDto,
  registerSchema,
  type ResetPasswordDto,
  resetPasswordSchema,
  type VerifyEmailDto,
  verifyEmailSchema,
} from '../dto/auth-request.dto.js';
import { type SessionResponse, sessionResponseSchema } from '../dto/auth-response.dto.js';
import { PasswordResetService } from '../services/password-reset.service.js';
import { RegistrationService } from '../services/registration.service.js';
import { SessionService } from '../services/session.service.js';

const MS_PER_DAY = 86_400_000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  public constructor(
    private readonly registration: RegistrationService,
    private readonly sessions: SessionService,
    private readonly passwordReset: PasswordResetService,
    private readonly users: UsersRepository,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @RateLimit(RateLimitPolicy.Strict)
  @Post('register')
  @ApiZodBody(registerSchema)
  @ApiZodResponse(
    HttpStatus.CREATED,
    userResponseSchema,
    'Account created; verification email sent',
  )
  public async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterDto,
  ): Promise<UserResponse> {
    return UserMapper.toResponse(await this.registration.register(body));
  }

  @Public()
  @RateLimit(RateLimitPolicy.Strict)
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiZodBody(verifyEmailSchema)
  public verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailDto,
  ): Promise<void> {
    return this.registration.verifyEmail(body.token);
  }

  @Public()
  @RateLimit(RateLimitPolicy.Strict)
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiZodBody(emailOnlySchema)
  public resendVerification(
    @Body(new ZodValidationPipe(emailOnlySchema)) body: EmailOnlyDto,
  ): Promise<void> {
    return this.registration.resendVerification(body.email);
  }

  @Public()
  @RateLimit(RateLimitPolicy.Strict)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiZodBody(loginSchema)
  @ApiZodResponse(HttpStatus.OK, sessionResponseSchema, 'Signed in; refresh token set as cookie')
  public async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    return this.startSession(await this.sessions.login(body), response);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sessionResponseSchema, 'New access token; refresh cookie rotated')
  public async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session = await this.sessions.refresh(AuthController.refreshCookie(request) ?? '');
    return this.startSession(session, response);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.logout(AuthController.refreshCookie(request));
    response.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Public()
  @RateLimit(RateLimitPolicy.Strict)
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiZodBody(emailOnlySchema)
  public forgotPassword(
    @Body(new ZodValidationPipe(emailOnlySchema)) body: EmailOnlyDto,
  ): Promise<void> {
    return this.passwordReset.requestReset(body.email);
  }

  @Public()
  @RateLimit(RateLimitPolicy.Strict)
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiZodBody(resetPasswordSchema)
  public resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
  ): Promise<void> {
    return this.passwordReset.reset(body);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiZodResponse(HttpStatus.OK, userResponseSchema)
  public async me(@CurrentUser() caller: AuthenticatedUser): Promise<UserResponse> {
    const user = await this.users.findById(caller.id);
    return UserMapper.toResponse(user ?? AuthController.gone());
  }

  private startSession(session: IssuedSession, response: Response): SessionResponse {
    response.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      httpOnly: true,
      secure: this.config.env.COOKIE_SECURE,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY,
    });
    return {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: UserMapper.toResponse(session.user),
    };
  }

  private static refreshCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string | undefined>;
    return cookies[REFRESH_COOKIE_NAME];
  }

  private static gone(): never {
    throw new Error('Authenticated user no longer exists');
  }
}
