import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

import { CurrentUser } from 'src/infrastructure/common/decorators/current-user.decorator';
import RoleGuard from 'src/infrastructure/common/guards/role.guard';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { ManageSurveyUseCases } from 'src/usecases/survey/manageSurvey.usecases';
import { AuthUser } from '../auth/authUser.interface';
import { EAppRoles } from '../auth/role.enum';
import {
  CreateSurveyDto,
  SetActiveSurveyDto,
  UpdateSurveyDto,
  ValidSurveyIdDto,
} from './manage-survey-dto.class';
import { GetSurveyPresenter } from './manageSurvey.presenter';

@ApiTags('Survey')
@Controller('survey')
@ApiBearerAuth('JWT')
@UseGuards(RoleGuard(EAppRoles.ADMIN))
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class AdminSurveysController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(ManageSurveyUseCases)
    private readonly manageSurveyProxyUC: UseCaseProxy<ManageSurveyUseCases>,
  ) { }

  @Post()
  @ApiCreatedResponse({ type: GetSurveyPresenter })
  @ApiBody({ type: CreateSurveyDto })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to create new surveys',
    operationId: 'createSurvey',
  })
  async createSurvey(
    @Body() dataDto: CreateSurveyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyPresenter> {
    return await this.manageSurveyProxyUC
      .getInstance()
      .create(user.id, dataDto);
  }

  @Patch('/:surveyId')
  @ApiOkResponse({ type: GetSurveyPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to update survey data',
    operationId: 'updateSurvey',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  async updateSurvey(
    @Body() dataDto: UpdateSurveyDto,
    @Param() { surveyId }: ValidSurveyIdDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyPresenter> {
    return await this.manageSurveyProxyUC
      .getInstance()
      .update(user.id, surveyId, dataDto);
  }

  @Put('/:surveyId/active')
  @ApiOkResponse({ type: GetSurveyPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to set survey as active',
    operationId: 'setActiveSurvey',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  async setActiveSurvey(
    @Body() { active }: SetActiveSurveyDto,
    @Param() { surveyId }: ValidSurveyIdDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyPresenter> {
    return await this.manageSurveyProxyUC
      .getInstance()
      .setActive(surveyId, active, user.id);
  }

  @Delete('/:surveyId')
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to delete (soft) survey data',
    operationId: 'deleteSurvey',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  async deleteSurvey(
    @Param() { surveyId }: ValidSurveyIdDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.manageSurveyProxyUC
      .getInstance()
      .delete(surveyId, user.id);
  }
}
