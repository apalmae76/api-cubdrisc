import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  ExpirationTimePresenter,
  GetOtpPresenter,
  LogginEmailOTPDto,
  LogginEmailOTPVerifyDto,
} from './auth-dto.class';
import {
  GetAuthTokensPresenter,
  GetRefreshTokenPresenter,
  IsAuthPresenter,
  RefreshTokenPresenter,
} from './auth.presenter';

import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { CurrentApp } from 'src/infrastructure/common/decorators/current-app.decorator';
import { CurrentUser } from 'src/infrastructure/common/decorators/current-user.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import JwtRefreshGuard from 'src/infrastructure/common/guards/jwtRefresh.guard';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';

import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { LoginUseCases } from '../../../usecases/auth/login.usecases';
import { LogoutUseCases } from '../../../usecases/auth/logout.usecases';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';
import { AuthUser } from './authUser.interface';
@ApiTags('Auth')
@Controller('auth')
@ApiBearerAuth('JWT')
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
@ApiExtraModels(IsAuthPresenter)
export class AuthController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(LoginUseCases)
    private readonly loginUC: UseCaseProxy<LoginUseCases>,
    @InjectUseCase(LogoutUseCases)
    private readonly logoutUC: UseCaseProxy<LogoutUseCases>,
    @InjectQueue('email') private readonly emailSyncQueue: Queue<EmailJobData>,
    private readonly logger: ApiLoggerService,
  ) { }

  @Post('mail-login/otp')
  @ApiCreatedResponse({ type: BaseResponsePresenter<GetAuthTokensPresenter> })
  @ApiBody({ type: LogginEmailOTPDto })
  @ApiOperation({
    description: `Recommended regular expression for validating email 
    is: /^[-a-z0-9~!$%^&\\*\\*=+}{'?]+(.[-a-z0-9~!$%^&\\*\\*=+}{\\'?]+)*@([a-z0-9_][-a-z0-9_]\\*(\\.[-a-z0-9_]+)\\*/
    \nOTP code is a 6-digit number (/[0-9]{6}$/)\n
    \nFirt request: Just whith email address, initiate authentication process, triggering the OTP sending.
    \nSecond request: Email address and Otp Code. You will receive the authentication token
    \n\n
    \n **IMPORTANT**: You may receive some personalized errors:
    \n- **HELP**: When request fails for otp fail maybe user needs our help to go on. Upon receiving it, it should show description help to the user.
  `,
    summary: 'Initiate authentication with email, triggering the OTP sending',
    operationId: 'postMailLoginOtp',
  })
  async postMailLoginOtp(
    @Body() auth: LogginEmailOTPDto,
    @CurrentApp() app: EAppTypes,
  ): Promise<GetOtpPresenter> {
    const response = await this.loginUC
      .getInstance()
      .sendLogInEmailOtpCode(auth.email, this.emailSyncQueue, app);
    return new GetOtpPresenter(
      new ExpirationTimePresenter(response.expirationTime),
      response.message,
    );
  }

  @Post('mail-login/token')
  @ApiCreatedResponse({ type: BaseResponsePresenter<GetAuthTokensPresenter> })
  @ApiBody({ type: LogginEmailOTPVerifyDto })
  @ApiOperation({
    description: `
    \nOTP code is a 6-digit number (/[0-9]{6}$/)\n
    \ndevice: Its required
    `,
    summary: 'Ends authentication with email, triggering tokens sending',
    operationId: 'postMailLoginTokens',
  })
  async postMailLoginTokens(
    @Body() auth: LogginEmailOTPVerifyDto,
    @CurrentApp() app: EAppTypes,
  ): Promise<BaseResponsePresenter<GetAuthTokensPresenter>> {
    const response = await this.loginUC
      .getInstance()
      .authenticateUserByOtpEmail(auth, app);
    if (response.data) {
      delete response.data.userId;
      delete response.data.email;
    }
    return response;
  }

  @Post('logout')
  @ApiCreatedResponse({ type: BaseResponsePresenter })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: '',
    summary: 'Close session',
    operationId: 'postLogout',
  })
  async logout(
    @CurrentUser() user: AuthUser,
    @CurrentApp() app: EAppTypes,
  ): Promise<BaseResponsePresenter<null>> {
    return await this.logoutUC.getInstance().execute(user.id, app);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: GetRefreshTokenPresenter })
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    description: `**IMPORTANT:**
    \n\n - ALL attributes are optional, BUT, if you send **deviceKey**, ALL, except fcmToken, will be required.
    `,
    summary: 'Refresh token',
    operationId: 'postRefresh',
  })
  async postRefresh(
    @CurrentUser() user: AuthUser,
    @CurrentApp() app: EAppTypes,
  ): Promise<BaseResponsePresenter<RefreshTokenPresenter>> {
    return await this.refreshToken(user, app);
  }

  async refreshToken(
    user: AuthUser,
    app: EAppTypes,
  ): Promise<BaseResponsePresenter<RefreshTokenPresenter>> {
    const response = await this.loginUC
      .getInstance()
      .getRefreshTokens(user, app);
    delete response.data.userId;
    delete response.data.email;
    return response;
  }
}
