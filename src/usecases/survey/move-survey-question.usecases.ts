import { NotFoundException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { MoveRowDto } from 'src/infrastructure/controllers/admin/manage-survey-question-dto.class';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class MoveSurveyQuestionUseCases extends UseCaseBase {
  constructor(
    private readonly surveyQuestionRepo: DatabaseSurveyQuestionsRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${MoveSurveyQuestionUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute(
    operatorId: number,
    surveyId: number,
    questionId: number,
    data: MoveRowDto,
  ): Promise<BooleanDataResponsePresenter> {
    const refOrder = await this.validate(surveyId, questionId, data);
    const question = await this.persistData(
      operatorId,
      surveyId,
      questionId,
      data,
      refOrder,
    );
    this.logger.debug(`Ends after save`, {
      operatorId,
      question,
    });
    return new BooleanDataResponsePresenter(
      `messages.survey_question.UPDATED_SUCESSFULLY|{"surveyId":"${surveyId}","questionId":"${questionId}"}`,
      question,
    );
  }

  private async validate(
    surveyId: number,
    questionId: number,
    data: MoveRowDto,
  ): Promise<number> {
    const [refQuestion] = await Promise.all([
      await this.surveyQuestionRepo.getById(surveyId, data.referenceId),
      await this.surveyQuestionRepo.canUpdate(surveyId, questionId),
    ]);
    if (!refQuestion) {
      const args = {
        surveyId,
        refQuestionId: data.referenceId,
        technicalError: `Reference question with id = ${data.referenceId} not found; check`,
      };
      throw new NotFoundException({
        message: [
          `validation.raffle_question.REF_NOT_FOUND|${JSON.stringify(args)}`,
        ],
      });
    }
    return refQuestion.order;
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    questionToMoveId: number,
    data: MoveRowDto,
    refOrder: number,
  ): Promise<boolean> {
    const context = `${this.context}persistData`;
    this.logger.debug(`Saving data`, {
      context,
      surveyId,
      questionToMoveId,
      refOrder,
      data,
    });

    let refPos = data.belowReference ? refOrder + 1 : refOrder - 1;
    if (refPos < 1) {
      refPos = 1;
    }

    const listToUpd = await this.surveyQuestionRepo.getToMove(
      surveyId,
      questionToMoveId,
      refPos,
    );

    let newPos = refPos;
    const opPayload: OperatorsActionCreateModel = {
      operatorId,
      actionId: EOperatorsActions.SURVEY_QUESTION_MOVE,
      details: { officeToMoveId: questionToMoveId, ...data },
      reason: 'Modifica una pregunta (cambia el orden de presentación)',
    };
    const result = await this.dataSource.transaction(async (em) => {
      await this.surveyQuestionRepo.setOrder(
        surveyId,
        questionToMoveId,
        refPos,
        em,
      );
      await Promise.all([
        this.operActionRepo.create(opPayload, em),
        listToUpd.map((val) => {
          this.surveyQuestionRepo.setOrder(surveyId, val.id, ++newPos, em);
        }),
      ]);
      return true;
    });
    if (result) {
      this.logger.debug('Moved successfully', { context });
      this.surveyQuestionRepo.cleanCacheData(surveyId);
      return true;
    }
    return false;
  }
}
