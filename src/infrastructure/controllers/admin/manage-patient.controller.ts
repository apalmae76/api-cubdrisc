import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { CurrentUser } from 'src/infrastructure/common/decorators/current-user.decorator';
import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { RolesGuard } from 'src/infrastructure/common/guards/role.guard';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { DiagnosePersonUseCases } from 'src/usecases/patient/diagnose-person.usecases';
import { ValidSurveyIdDto } from '../admin/manage-survey-dto.class';
import {
  ValidPersonIdDto,
  ValidPersonSurveyIdDto,
} from '../admin/manage-survey-question-dto.class';
import { AuthUser } from '../auth/auth-user.interface';
import { EAppRoles } from '../auth/role.enum';
import { DiagnosePersonDto } from './manage-patient-dto.class';

@ApiTags('Patient')
@Controller('patient')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard([EAppRoles.ADMIN, EAppRoles.MEDIC]))
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class ManagePatientsController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(DiagnosePersonUseCases)
    private readonly diagnosePersonProxyUC: UseCaseProxy<DiagnosePersonUseCases>,
    @InjectQueue('email') private readonly emailSyncQueue: Queue<EmailJobData>,
  ) { }

  @Put('/:personId/survey/:surveyId/:personSurveyId/diagnose')
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiBody({ type: DiagnosePersonDto })
  @ApiOperation({
    description: '',
    summary: 'Allows medics to set person diagnose',
    operationId: 'setDiagnose',
  })
  @ApiParam({
    name: 'personSurveyId',
    type: 'number',
    example: 345,
    description: 'Person-Survey reference id',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'personId',
    type: 'number',
    example: 34,
    description: 'Person ID that will be affected',
  })
  async setDiagnose(
    @Param() { personSurveyId }: ValidPersonSurveyIdDto,
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { personId }: ValidPersonIdDto,
    @Body() dataDto: DiagnosePersonDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.diagnosePersonProxyUC.getInstance().execute({
      operatorId: user.id,
      personId,
      surveyId,
      personSurveyId,
      dataDto,
      emailSyncQueue: this.emailSyncQueue,
    });
  }
}
