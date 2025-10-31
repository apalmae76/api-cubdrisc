import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { ManagePersonSurveyUseCases } from 'src/usecases/patient/managePersonSurvey.usecases';
import { CreatePersonSurveyDto } from './patient-answer-dto.class';

@ApiTags('Patient')
@Controller('patient')
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class ManagePatientController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(ManagePersonSurveyUseCases)
    private readonly managePersonSurveyProxyUC: UseCaseProxy<ManagePersonSurveyUseCases>,
  ) { }

  // Manage patients & patiens survey answers --------------------------------------------------------
  @Post('survey')
  @ApiCreatedResponse({ type: BooleanDataResponsePresenter })
  @ApiBody({ type: CreatePersonSurveyDto })
  @ApiOperation({
    description: '',
    summary: 'Allows persons to create new surveys',
    operationId: 'createSurvey',
  })
  async createSurvey(
    @Body() dataDto: CreatePersonSurveyDto,
  ): Promise<BaseResponsePresenter<number>> {
    return await this.managePersonSurveyProxyUC.getInstance().create(dataDto);
  }
}
