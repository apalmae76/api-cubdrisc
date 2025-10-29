import { NotFoundException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { MoveRowDto } from 'src/infrastructure/controllers/admin/manage-survey-question-dto.class';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operatorsActions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/surveyQuestionsPossibleAnswers.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class MoveSurveyQuestionAnswerUseCases extends UseCaseBase {
  constructor(
    private readonly surveyQAnsRepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${MoveSurveyQuestionAnswerUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute(
    operatorId: number,
    surveyId: number,
    questionId: number,
    answerId: number,
    data: MoveRowDto,
  ): Promise<BooleanDataResponsePresenter> {
    const refOrder = await this.validate(surveyId, questionId, answerId, data);
    const question = await this.persistData(
      operatorId,
      surveyId,
      questionId,
      answerId,
      data,
      refOrder,
    );
    this.logger.debug(`Ends after save`, {
      operatorId,
      question,
    });
    return new BooleanDataResponsePresenter(
      `messages.survey_question_answer.UPDATED_SUCESSFULLY|{"surveyId":"${surveyId}","questionId":"${questionId}","answerId":"${answerId}"}`,
      question,
    );
  }

  private async validate(
    surveyId: number,
    questionId: number,
    answerId: number,
    data: MoveRowDto,
  ): Promise<number> {
    const [refQuestion] = await Promise.all([
      await this.surveyQAnsRepo.getById(surveyId, questionId, data.referenceId),
      await this.surveyQAnsRepo.canUpdate(surveyId, questionId, answerId),
    ]);
    if (!refQuestion) {
      const args = {
        surveyId,
        questionId,
        refAnswerId: data.referenceId,
        technicalError: `Reference answer with id = ${data.referenceId} not found; check`,
      };
      throw new NotFoundException({
        message: [
          `validation.survey_question_answer.REF_NOT_FOUND|${JSON.stringify(args)}`,
        ],
      });
    }
    return refQuestion.order;
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    questionId: number,
    answerToMoveId: number,
    data: MoveRowDto,
    refOrder: number,
  ): Promise<boolean> {
    const context = `${this.context}persistData`;
    this.logger.debug(`Saving data`, {
      context,
      surveyId,
      questionId,
      answerToMoveId,
      refOrder,
      data,
    });

    let refPos = data.belowReference ? refOrder + 1 : refOrder - 1;
    if (refPos < 1) {
      refPos = 1;
    }

    const listToUpd = await this.surveyQAnsRepo.getToMove(
      surveyId,
      questionId,
      answerToMoveId,
      refPos,
    );

    let newPos = refPos;
    const opPayload: OperatorsActionCreateModel = {
      operatorId,
      toUserId: null,
      actionId: EOperatorsActions.SURVEY_QUESTION_MOVE,
      details: { officeToMoveId: answerToMoveId, ...data },
      reason: 'Modifica una respuesta (cambia el orden de presentación)',
    };
    const result = await this.dataSource.transaction(async (em) => {
      await this.surveyQAnsRepo.setOrder(
        surveyId,
        questionId,
        answerToMoveId,
        refPos,
        em,
      );
      await Promise.all([
        this.operActionRepo.create(opPayload, em),
        listToUpd.map((val) => {
          this.surveyQAnsRepo.setOrder(
            surveyId,
            questionId,
            val.id,
            ++newPos,
            em,
          );
        }),
      ]);
      return true;
    });
    if (result) {
      this.logger.debug('Moved successfully', { context });
      this.surveyQAnsRepo.cleanCacheData(surveyId, questionId);
      return true;
    }
    return false;
  }
}
