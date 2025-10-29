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
import { ManageSurveyQuestionUseCases } from 'src/usecases/survey/manageSurveyQuestion.usecases';
import { ManageSurveyQuestionAnswerUseCases } from 'src/usecases/survey/manageSurveyQuestionAnswer.usecases';
import { MoveSurveyQuestionUseCases } from 'src/usecases/survey/moveSurveyQuestion.usecases';
import { MoveSurveyQuestionAnswerUseCases } from 'src/usecases/survey/moveSurveyQuestionAnswer.usecases';
import { AuthUser } from '../auth/authUser.interface';
import { EAppRoles } from '../auth/role.enum';
import {
  CreateSurveyDto,
  SetActiveSurveyDto,
  UpdateSurveyDto,
  ValidSurveyIdDto,
} from './manage-survey-dto.class';
import {
  CreateSurveyQuestionAnswerDto,
  UpdateSurveyQuestionAnswerDto,
  ValidAnswerIdDto,
} from './manage-survey-question-answer-dto.class';
import {
  CreateSurveyQuestionDto,
  MoveRowDto,
  UpdateSurveyQuestionDto,
  ValidQuestionIdDto,
} from './manage-survey-question-dto.class';
import { GetSurveyPresenter } from './manageSurvey.presenter';
import { GetSurveyQuestionPresenter } from './manageSurveyQuestion.presenter';
import { GetSurveyQuestionAnswerPresenter } from './manageSurveyQuestionAnswer.presenter';

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
    @InjectUseCase(ManageSurveyQuestionUseCases)
    private readonly manageSurveyQuestionProxyUC: UseCaseProxy<ManageSurveyQuestionUseCases>,
    @InjectUseCase(MoveSurveyQuestionUseCases)
    private readonly moveSurveyQuestionProxyUC: UseCaseProxy<MoveSurveyQuestionUseCases>,
    @InjectUseCase(ManageSurveyQuestionAnswerUseCases)
    private readonly manageSurveyQAnsProxyUC: UseCaseProxy<ManageSurveyQuestionAnswerUseCases>,
    @InjectUseCase(MoveSurveyQuestionAnswerUseCases)
    private readonly moveSurveyQAnsProxyUC: UseCaseProxy<MoveSurveyQuestionAnswerUseCases>,
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
      .setActive(user.id, surveyId, active);
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
      .delete(user.id, surveyId);
  }

  @Post('/:surveyId/question')
  @ApiCreatedResponse({ type: GetSurveyQuestionPresenter })
  @ApiBody({ type: CreateSurveyQuestionDto })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to create new survey questions',
    operationId: 'createSurveyQuestion',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  async createSurveyQuestion(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Body() dataDto: CreateSurveyQuestionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyQuestionPresenter> {
    return await this.manageSurveyQuestionProxyUC
      .getInstance()
      .create(user.id, surveyId, dataDto);
  }

  @Patch('/:surveyId/question/:questionId')
  @ApiBody({ type: UpdateSurveyQuestionDto })
  @ApiOkResponse({ type: GetSurveyQuestionPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to update survey question data',
    operationId: 'updateSurveyQuestion',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  async updateSurveyQuestion(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Body() dataDto: UpdateSurveyQuestionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyQuestionPresenter> {
    return await this.manageSurveyQuestionProxyUC
      .getInstance()
      .update(user.id, surveyId, questionId, dataDto);
  }

  @Put('/:surveyId/question/:questionId/active')
  @ApiOkResponse({ type: GetSurveyQuestionPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to set survey question as active',
    operationId: 'setActiveQuestion',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  async setActiveQuestion(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Body() { active }: SetActiveSurveyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyQuestionPresenter> {
    return await this.manageSurveyQuestionProxyUC
      .getInstance()
      .setActive(user.id, surveyId, questionId, active);
  }

  @Patch('/:surveyId/question/:questionId/move')
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows operators to modify a question presentation order',
    operationId: 'patchMoveQuestion',
  })
  @ApiBody({ type: MoveRowDto })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  async patchMoveQuestion(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Body() dataDto: MoveRowDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.moveSurveyQuestionProxyUC
      .getInstance()
      .execute(user.id, surveyId, questionId, dataDto);
  }

  @Delete('/:surveyId/question/:questionId')
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to delete (soft) survey data',
    operationId: 'deleteQuestion',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  async deleteQuestion(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.manageSurveyQuestionProxyUC
      .getInstance()
      .delete(user.id, surveyId, questionId);
  }

  // Manage answers --------------------------------------------
  @Post('/:surveyId/question/:questionId/answer')
  @ApiCreatedResponse({ type: GetSurveyQuestionAnswerPresenter })
  @ApiBody({ type: CreateSurveyQuestionAnswerDto })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to create new survey question answer',
    operationId: 'createSurveyQuestionAnswer',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  async createSurveyQuestionAnswer(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Body() dataDto: CreateSurveyQuestionAnswerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyQuestionAnswerPresenter> {
    return await this.manageSurveyQAnsProxyUC
      .getInstance()
      .create(user.id, surveyId, questionId, dataDto);
  }

  @Patch('/:surveyId/question/:questionId/answer/:answerId')
  @ApiBody({ type: UpdateSurveyQuestionAnswerDto })
  @ApiOkResponse({ type: GetSurveyQuestionAnswerPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to update survey question answer data',
    operationId: 'updateSurveyQuestionAnswer',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  @ApiParam({
    name: 'answerId',
    type: 'number',
    example: 34,
    description: 'Answer ID that will be affected',
  })
  async updateSurveyQuestionAnswer(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Param() { answerId }: ValidAnswerIdDto,
    @Body() dataDto: UpdateSurveyQuestionAnswerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyQuestionAnswerPresenter> {
    return await this.manageSurveyQAnsProxyUC
      .getInstance()
      .update(user.id, surveyId, questionId, answerId, dataDto);
  }

  @Put('/:surveyId/question/:questionId/answer/:answerId/active')
  @ApiOkResponse({ type: GetSurveyQuestionAnswerPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to set survey question answer as active',
    operationId: 'setActiveQuestionAnswer',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  @ApiParam({
    name: 'answerId',
    type: 'number',
    example: 34,
    description: 'Answer ID that will be affected',
  })
  async setActiveQuestionAnswer(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Param() { answerId }: ValidAnswerIdDto,
    @Body() { active }: SetActiveSurveyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetSurveyQuestionAnswerPresenter> {
    return await this.manageSurveyQAnsProxyUC
      .getInstance()
      .setActive(user.id, surveyId, questionId, answerId, active);
  }

  @Patch('/:surveyId/question/:questionId/answer/:answerId/move')
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows operators to modify a question answer presentation order',
    operationId: 'patchMoveQuestionAnswer',
  })
  @ApiBody({ type: MoveRowDto })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  @ApiParam({
    name: 'answerId',
    type: 'number',
    example: 34,
    description: 'Answer ID that will be affected',
  })
  async patchMoveQuestionAnswer(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Param() { answerId }: ValidAnswerIdDto,
    @Body() dataDto: MoveRowDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.moveSurveyQAnsProxyUC
      .getInstance()
      .execute(user.id, surveyId, questionId, answerId, dataDto);
  }

  @Delete('/:surveyId/question/:questionId/answer/:answerId')
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to delete (soft) survey answer data',
    operationId: 'deleteAnswer',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  @ApiParam({
    name: 'answerId',
    type: 'number',
    example: 34,
    description: 'Answer ID that will be affected',
  })
  async deleteAnswer(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Param() { answerId }: ValidAnswerIdDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.manageSurveyQAnsProxyUC
      .getInstance()
      .delete(user.id, surveyId, questionId, answerId);
  }
}
