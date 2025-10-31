/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import {
  ERepoRefForGetEntity,
  GetGenericAllDto,
  GetGenericDetailDto,
  allowedEntitiesForGetDetail,
} from 'src/infrastructure/common/dtos/genericRepo-dto.class';

import { BadRequestException } from '@nestjs/common';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import {
  EAppTypes,
  EOperatorsActions,
} from 'src/infrastructure/common/utils/constants';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { DatabaseEmailRepository } from 'src/infrastructure/repositories/email.repository';
import { DatabasePatientRepository } from 'src/infrastructure/repositories/patient.repository';
import { DatabasePersonRepository } from 'src/infrastructure/repositories/person.repository';
import { DatabasePersonSurveyRepository } from 'src/infrastructure/repositories/personSurvey.repository';
import { DatabasePersonSurveyAnswersRepository } from 'src/infrastructure/repositories/personSurveyAnswers.repository';
import { DatabasePhoneRepository } from 'src/infrastructure/repositories/phone.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/surveyQuestions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/surveyQuestionsPossibleAnswers.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from 'src/infrastructure/repositories/surveyRiskCalculationRules.repository';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class GetGenericInfoUseCases extends UseCaseBase {
  constructor(
    private readonly personRepo: DatabasePersonRepository,
    private readonly userRepo: DatabaseUserRepository,
    private readonly patientRepo: DatabasePatientRepository,
    private readonly userPhoneRepo: DatabasePhoneRepository,
    private readonly userEmailsRepo: DatabaseEmailRepository,
    private readonly surveysRepo: DatabaseSurveyRepository,
    private readonly surveyRulesRepo: DatabaseSurveyRiskCalculationRulesRepository,
    private readonly surveysQuestionsRepo: DatabaseSurveyQuestionsRepository,
    private readonly surveysQuestionsPARepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
    private readonly patientSurveyRepo: DatabasePersonSurveyRepository,
    private readonly patientSARepo: DatabasePersonSurveyAnswersRepository,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${GetGenericInfoUseCases.name}.`;
  }

  async getAll(
    userId: number,
    dataDto: GetGenericAllDto,
  ): Promise<BaseResponsePresenter<PageDto<any>>> {
    const context = `${this.context}getAll`;
    this.logger.debug('Starting', {
      userId,
      data: dataDto,
      entity: ERepoRefForGetEntity[dataDto.entityName],
      context,
    });
    try {
      if (ERepoRefForGetEntity[dataDto.entityName] === undefined) {
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_ENTITY`],
        });
      }

      const response =
        await this[ERepoRefForGetEntity[dataDto.entityName]].getByQuery(
          dataDto,
        );

      return new BaseResponsePresenter('AUTO', response);
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  async getDetails(
    userId: number,
    dataDto: GetGenericDetailDto,
  ): Promise<BaseResponsePresenter<any>> {
    const context = `${this.context}getDetails`;
    this.logger.debug('Starting', {
      userId,
      data: dataDto,
      context,
    });
    try {
      if (ERepoRefForGetEntity[dataDto.entityName] === undefined) {
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_ENTITY`],
        });
      }
      if (!allowedEntitiesForGetDetail.includes(dataDto.entityName)) {
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_ENTITY_DEV`],
        });
      }
      const response = await this[
        ERepoRefForGetEntity[dataDto.entityName]
      ].getByIdForPanel(dataDto.id);

      return new BaseResponsePresenter('AUTO', response);
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  getEnums(): any {
    const enums = {
      EAppRoles: Object.keys(EAppRoles).map((v) => v),
      EOperatorsActions: Object.values(EOperatorsActions)
        .filter((value) => typeof value === 'string')
        .map((v) => v),
      EAppTypes: Object.keys(EAppTypes).map((v) => v),
    };

    return enums;
  }
}
