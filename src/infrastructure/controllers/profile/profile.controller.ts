import { InjectQueue } from '@nestjs/bull';
import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Queue } from 'bull';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { CurrentApp } from 'src/infrastructure/common/decorators/current-app.decorator';
import { CurrentUser } from 'src/infrastructure/common/decorators/current-user.decorator';
import { CorrelationId } from 'src/infrastructure/common/decorators/req-correlation-id';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import RoleGuard from 'src/infrastructure/common/guards/role.guard';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { UseCaseProxy } from 'src/infrastructure/usecases-proxy/usecases-proxy';
import { UsecasesProxyModule } from 'src/infrastructure/usecases-proxy/usecases-proxy.module';
import { UpdateUserUseCases } from 'src/usecases/admin/updateUser.usecases';
import { UpdUserEmailWithOtpUseCases } from 'src/usecases/profile/updUserEmailWithOTP.usecases';
import { AuthUser } from '../auth/authUser.interface';
import { EAppRoles } from '../auth/role.enum';
import { UpdateEmailOTPDto } from './profile-dto.class';
import { GetUserPresenter, ProfileUserPresenter } from './profile.presenter';

@ApiTags('Profile')
@ApiBearerAuth('JWT')
@Controller('profile')
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class ProfileController {
  constructor(
    @Inject(UsecasesProxyModule.UPDATE_USER)
    private readonly updateUserProxyUC: UseCaseProxy<UpdateUserUseCases>,
    @Inject(UsecasesProxyModule.USER_EMAIL)
    private readonly updUserEmailWithOtpUC: UseCaseProxy<UpdUserEmailWithOtpUseCases>,
    @InjectQueue('email') private readonly emailSyncQueue: Queue<EmailJobData>,
  ) { }

  @Get()
  @UseGuards(RoleGuard(EAppRoles.MEDIC))
  @ApiOkResponse({ type: GetUserPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows users to obtain their profile user info',
    operationId: 'getProfile',
  })
  async getProfileInfo(
    @CurrentUser() user: AuthUser,
  ): Promise<BaseResponsePresenter<ProfileUserPresenter>> {
    const response = await this.updateUserProxyUC
      .getInstance()
      .getUserProfileInfo(user.id);
    return new BaseResponsePresenter(
      'messages.common.DATA_GET_SUCCESSFULLY',
      response,
    );
  }

  @Patch('email')
  @UseGuards(RoleGuard(EAppRoles.MEDIC))
  @ApiOkResponse({ type: BaseResponsePresenter<null> })
  @ApiBody({ type: UpdateEmailOTPDto })
  @ApiOperation({
    description: `You must make a first request, sending only the email
    \nAt that point, you will receive the OTP code
    \nThe second request will then be to this same endpoint, but including the OTP code
    \nIMPORTANT: User must have **MEDIC** role, which means they must have verified their email address before they can modify it`,
    summary: 'Allows users, to change their email address',
    operationId: 'patchProfileEmail',
  })
  async emailOtpVerification(
    @Body() dataDto: UpdateEmailOTPDto,
    @CurrentUser() user: AuthUser,
    @CurrentApp() app: EAppTypes,
    @CorrelationId() correlationId: string,
  ): Promise<BaseResponsePresenter<null>> {
    if (dataDto.otpCode) {
      await this.updUserEmailWithOtpUC
        .getInstance()
        .verifyEmailOtpCode(user.id, dataDto, 'Profile, update email');
      return new BaseResponsePresenter('messages.profile.EMAIL_VERIFIED');
    } else {
      return await this.updUserEmailWithOtpUC
        .getInstance()
        .sendEmailOtpVerification(
          user.id,
          dataDto,
          this.emailSyncQueue,
          correlationId,
        );
    }
  }
}
