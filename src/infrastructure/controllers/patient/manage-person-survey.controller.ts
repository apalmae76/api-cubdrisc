import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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

import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { FinishPersonSurveyUseCases } from 'src/usecases/patient/finish-person-survey.usecases';
import { ManagePersonSurveyAnswerUseCases } from 'src/usecases/patient/manage-person-survey-answer.usecases';
import { ManagePersonSurveyUseCases } from 'src/usecases/patient/manage-person-survey.usecases';
import { ValidSurveyIdDto } from '../admin/manage-survey-dto.class';
import {
  ValidGenderDto,
  ValidQuestionIdDto,
  ValidReferenceIdDto,
} from '../admin/manage-survey-question-dto.class';
import { Gender } from '../profile/profile-dto.class';
import {
  CreatePersonSurveyDto,
  PatchPersonSurveyDto,
  PatchPersonSurveyIMCDto,
  PutAnswerDto,
  ReferenceIdDto,
} from './person-answer-dto.class';
import {
  GetPersonSurveyFinishPresenter,
  GetPersonSurveyPresenter,
  GetPublicSurveyPresenter,
  GetPublicSurveyQuestionPresenter,
  GetPublicSurveyQuestionsPresenter,
} from './person-survey.presenter';

@ApiTags('Patient')
@Controller('patient')
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class ManagePersonSurveyController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(ManagePersonSurveyUseCases)
    private readonly managePersonSurveyProxyUC: UseCaseProxy<ManagePersonSurveyUseCases>,
    @InjectUseCase(ManagePersonSurveyAnswerUseCases)
    private readonly managePSAnswerProxyUC: UseCaseProxy<ManagePersonSurveyAnswerUseCases>,
    @InjectUseCase(FinishPersonSurveyUseCases)
    private readonly finishPersonSurveyProxyUC: UseCaseProxy<FinishPersonSurveyUseCases>,
    @InjectQueue('email') private readonly emailSyncQueue: Queue<EmailJobData>,
  ) { }

  // Get active survey base data ---------------------------------------------------------------------
  @Get('survey')
  @ApiOkResponse({ type: GetPublicSurveyPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows persons to get active survey',
    operationId: 'getSurvey',
  })
  async getSurvey(): Promise<GetPublicSurveyPresenter> {
    return await this.managePSAnswerProxyUC.getInstance().getSurvey();
  }

  @Get('survey/:surveyId/question/:questionId/:referenceId')
  @ApiOkResponse({ type: GetPublicSurveyQuestionPresenter })
  @ApiBody({ type: ReferenceIdDto })
  @ApiOperation({
    description: '',
    summary:
      'Allows persons to get active survey question & possible answers data',
    operationId: 'getSurveyQuestion',
  })
  @ApiParam({
    name: 'questionId',
    type: 'number',
    example: 34,
    description: 'Question ID that will be affected',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'referenceId',
    type: 'uuid',
    example: '9d77c4db-ccec-4434-9764-e86d685e7b86',
    description: 'Proccess reference id',
  })
  async getSurveyQuestion(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { questionId }: ValidQuestionIdDto,
    @Param() { referenceId }: ValidReferenceIdDto,
  ): Promise<GetPublicSurveyQuestionPresenter> {
    return await this.managePSAnswerProxyUC
      .getInstance()
      .getSurveyQuestion(surveyId, questionId, referenceId);
  }

  @Get('survey/:surveyId/questions/:gender')
  @ApiOkResponse({ type: GetPublicSurveyQuestionsPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows persons to get active survey questions by sex',
    operationId: 'getSurveyQuestions',
  })
  @ApiParam({
    name: 'surveyId',
    type: 'number',
    example: 34,
    description: 'Survey ID that will be affected',
  })
  @ApiParam({
    name: 'gender',
    type: 'string',
    example: Gender.FEMALE,
    description: 'gender',
  })
  async getSurveyQuestions(
    @Param() { surveyId }: ValidSurveyIdDto,
    @Param() { gender }: ValidGenderDto,
  ): Promise<GetPublicSurveyQuestionsPresenter> {
    console.log('Aqui ----------------------------->>>>>>>>>>>>>>>>>>>>');
    return await this.managePSAnswerProxyUC
      .getInstance()
      .getSurveyQuestions(surveyId, gender);
  }

  // Manage patients & patiens survey answers --------------------------------------------------------
  @Post('survey')
  @ApiCreatedResponse({ type: GetPersonSurveyPresenter })
  @ApiBody({ type: CreatePersonSurveyDto })
  @ApiOperation({
    description: '',
    summary:
      'Allows persons to create new surveys. Use only in firt time, when referenceId its not available yet',
    operationId: 'createSurvey',
  })
  async createSurvey(
    @Body() dataDto: CreatePersonSurveyDto,
  ): Promise<GetPersonSurveyPresenter> {
    return await this.managePersonSurveyProxyUC.getInstance().create(dataDto);
  }

  @Patch('survey')
  @ApiCreatedResponse({ type: GetPersonSurveyPresenter })
  @ApiBody({ type: PatchPersonSurveyDto })
  @ApiOperation({
    description: '',
    summary:
      'Allows persons to update a survey. Use ones referenceId its available',
    operationId: 'patchSurvey',
  })
  async patchSurvey(
    @Body() dataDto: PatchPersonSurveyDto,
  ): Promise<GetPersonSurveyPresenter> {
    return await this.managePersonSurveyProxyUC.getInstance().update(dataDto);
  }

  @Patch('survey/imc')
  @ApiCreatedResponse({ type: GetPersonSurveyPresenter })
  @ApiBody({ type: PatchPersonSurveyIMCDto })
  @ApiOperation({
    description: '',
    summary:
      'Allows persons to update a survey imc data. Use ones referenceId its available',
    operationId: 'patchSurveyIMC',
  })
  async patchSurveyIMC(
    @Body() dataDto: PatchPersonSurveyIMCDto,
  ): Promise<GetPersonSurveyPresenter> {
    return await this.managePersonSurveyProxyUC
      .getInstance()
      .updateIMC(dataDto);
  }

  @Put('survey/:surveyId/question/:questionId')
  @ApiBody({ type: PutAnswerDto })
  @ApiOkResponse({ type: BooleanDataResponsePresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows users, to answer test questions',
    operationId: 'putAnswer',
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
    @Body() dataDto: PutAnswerDto,
  ): Promise<BooleanDataResponsePresenter> {
    return await this.managePSAnswerProxyUC
      .getInstance()
      .putAnswer(surveyId, questionId, dataDto);
  }

  @Patch('survey/finish')
  @ApiCreatedResponse({ type: GetPersonSurveyFinishPresenter })
  @ApiBody({ type: ReferenceIdDto })
  @ApiOperation({
    description: '',
    summary:
      'Allows persons to ends survey and save final data. Use ones referenceId its available, as end request',
    operationId: 'postSurveyFinish',
  })
  async postSurveyFinish(
    @Body() { referenceId }: ReferenceIdDto,
  ): Promise<GetPersonSurveyFinishPresenter> {
    return await this.finishPersonSurveyProxyUC
      .getInstance()
      .execute(referenceId, this.emailSyncQueue);
  }
}
