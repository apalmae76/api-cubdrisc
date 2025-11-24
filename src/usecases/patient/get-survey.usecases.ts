import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { ReferenceIdDto } from 'src/infrastructure/controllers/patient/person-answer-dto.class';
import {
  GetPublicSurveyPresenter,
  GetPublicSurveyQuestionPresenter,
  PersonSurveyPresenter,
  PublicAnswerPresenter,
  PublicSurveyPresenter,
  PublicSurveyQuestionPresenter,
} from 'src/infrastructure/controllers/patient/person-survey.presenter';
import { DatabasePersonSurveyAnswersRepository } from 'src/infrastructure/repositories/person-survey-answers.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/survey-questions-possible-answers.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class GetSurveyUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyQuestionsRepo: DatabaseSurveyQuestionsRepository,
    private readonly surveyQPARepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
    private readonly personSurveyAnswerRepo: DatabasePersonSurveyAnswersRepository,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${GetSurveyUseCases.name}.`;
  }

  @UseCaseLogger()
  async getSurvey(): Promise<GetPublicSurveyPresenter> {
    const survey = await this.surveyRepo.getActive();
    let questionsIds: number[] = [];
    if (survey) {
      questionsIds = await this.surveyQuestionsRepo.getIds(survey.id);
    }
    const response = survey
      ? new PublicSurveyPresenter(survey, questionsIds)
      : null;
    return new BaseResponsePresenter('AUTO', response);
  }

  @UseCaseLogger()
  async getSurveyQuestion(
    surveyId: number,
    questionId: number,
    dataDto: ReferenceIdDto,
  ): Promise<GetPublicSurveyQuestionPresenter> {
    const [survey, question] = await Promise.all([
      this.surveyRepo.getByIdOrFail(surveyId),
      this.surveyQuestionsRepo.getByIdOrFail(surveyId, questionId),
    ]);
    const answers: PublicAnswerPresenter[] = [];
    if (survey) {
      const answersModel = await this.surveyQPARepo.getAnswers(
        surveyId,
        questionId,
      );
      if (answersModel.length > 0) {
        const referenceId = dataDto.referenceId;
        const cacheKey = `PatientSurvey:${referenceId}`;
        const personSurveyData =
          await this.redisService.get<PersonSurveyPresenter>(cacheKey);

        for (const answer of answersModel) {
          const selectAnswer = personSurveyData
            ? await this.personSurveyAnswerRepo.isAnswer(
              personSurveyData.personId,
              personSurveyData.surveyId,
              personSurveyData.personSurveyId,
              questionId,
              answer.id,
            )
            : false;
          answers.push(new PublicAnswerPresenter(answer, selectAnswer));
        }
      }
    }
    const response = survey
      ? new PublicSurveyQuestionPresenter(question, answers)
      : null;
    return new BaseResponsePresenter('AUTO', response);
  }
}
