import { BadRequestException } from '@nestjs/common';
import { addYears, differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonCreateModel, PersonUpdateModel } from 'src/domain/model/person';
import { PersonSurveyCreateModel } from 'src/domain/model/personSurvey';
import { SurveyModel, SurveyUpdateModel } from 'src/domain/model/survey';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { formatDateTimeToIsoString } from 'src/infrastructure/common/utils/format-date';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UpdateSurveyDto } from 'src/infrastructure/controllers/admin/manage-survey-dto.class';
import { SurveyPresenter } from 'src/infrastructure/controllers/admin/manageSurvey.presenter';
import { CreatePersonSurveyDto } from 'src/infrastructure/controllers/patient/patient-answer-dto.class';
import { DatabasePersonRepository } from 'src/infrastructure/repositories/person.repository';
import { DatabasePersonSurveyRepository } from 'src/infrastructure/repositories/personSurvey.repository';
import { DatabasePersonSurveyAnswersRepository } from 'src/infrastructure/repositories/personSurveyAnswers.repository';
import { DatabaseStateRepository } from 'src/infrastructure/repositories/state.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

type CreatePersonSurvey = {
  person?: PersonCreateModel;
  personUpd?: PersonUpdateModel;
  personSurvey: PersonSurveyCreateModel;
};

@InjectableUseCase()
export class ManagePersonSurveyUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly personRepo: DatabasePersonRepository,
    private readonly personSurveyRepo: DatabasePersonSurveyRepository,
    private readonly personSurveyAnsRepo: DatabasePersonSurveyAnswersRepository,
    private readonly stateRepo: DatabaseStateRepository,
    private readonly appConfig: EnvironmentConfigService,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManagePersonSurveyUseCases.name}.`;
  }

  @UseCaseLogger()
  async create(
    dataDto: CreatePersonSurveyDto,
  ): Promise<BaseResponsePresenter<number>> {
    const createData = await this.validateCreate(dataDto);
    const personId = await this.persistCreate(createData);
    return new BaseResponsePresenter(
      `messages.person_survey.CREATED_SUCESSFULLY|{"identityCardNumber":"${dataDto.ci}"}`,
      personId,
    );
  }

  private async validateCreate(
    dataDto: CreatePersonSurveyDto,
  ): Promise<CreatePersonSurvey> {
    const [personDb] = await Promise.all([
      this.personRepo.getByCi(dataDto.ci),
      this.stateRepo.ensureExistOrFail(dataDto.stateId),
      this.surveyRepo.getByIdOrFail(dataDto.surveyId),
    ]);
    const today = new Date();
    // verify other test
    if (personDb) {
      const lastTest = await this.personSurveyRepo.getLastByPersonId(
        personDb.id,
        dataDto.surveyId,
      );
      if (lastTest) {
        if (lastTest.totalScore) {
          // verify if 1 year old min, if not, error
          const time = differenceInYears(today, lastTest.updatedAt);
          if (time < 1) {
            const date = addYears(lastTest.updatedAt, 1);
            const args = {
              surveyId: dataDto.surveyId,
              personCi: dataDto.ci,
              date: format(date, "dd 'de' MMMM 'de' yyyy", { locale: es }),
              technicalError: `Person (${personDb.id}), has a valid test. next test can be taken from ${date}`,
            };
            throw new BadRequestException({
              message: [
                `validation.person_survey.HAS_VALID_TEST|${JSON.stringify(args)}`,
              ],
            });
          }
        } else {
          const args = {
            surveyId: dataDto.surveyId,
            personCi: dataDto.ci,
            technicalError: `Person (${personDb.id}), has already started the test (${dataDto.surveyId}). You must modify it`,
          };
          throw new BadRequestException({
            message: [
              `validation.person_survey.HAS_ALREADY_STARTED|${JSON.stringify(args)}`,
            ],
          });
        }
      }
    }
    const personSurvey: PersonSurveyCreateModel = {
      personId: personDb ? personDb.id : null,
      surveyId: dataDto.surveyId,
      stateId: dataDto.stateId,
      email: dataDto.email ?? null,
      phone: dataDto.phone ?? null,
      age: differenceInYears(today, dataDto.dateOfBirth),
    };
    const response: CreatePersonSurvey = {
      personSurvey,
    };
    if (personDb) {
      response.person = null;
      response.personUpd = this.getForUpdate(personDb, dataDto);
    } else {
      response.person = dataDto;
      response.personUpd = null;
    }
    return response;
  }

  private async persistCreate(data: CreatePersonSurvey): Promise<number> {
    return await this.dataSource.transaction(async (em) => {
      if (data.person !== null) {
        const person = await this.personRepo.create(data.person, em);
        data.personSurvey.personId = person.id;
      } else if (data.personUpd !== null) {
        await this.personRepo.update(
          data.personSurvey.personId,
          data.personUpd,
          em,
        );
      }
      const personSurvey = await this.personSurveyRepo.create(
        data.personSurvey,
        em,
      );
      return personSurvey.personId;
    });
  }

  @UseCaseLogger()
  async update(
    operatorId: number,
    surveyId: number,
    dataDto: UpdateSurveyDto,
  ): Promise<BaseResponsePresenter<SurveyPresenter>> {
    const context = `${this.context}update`;
    const { newData, survey } = await this.validateUpdate(surveyId, dataDto);

    if (newData === null) {
      const response = new BaseResponsePresenter(
        `messages.survey.CREATED_SUCESSFULLY|{"name":"${dataDto.name}"}`,
        new SurveyPresenter(survey),
      );
      return this.handleNoChangedValuesOnUpdate(
        context,
        response,
        this.appConfig.isProductionEnv(),
      );
    }

    const updSurvey = await this.persistData(operatorId, surveyId, newData);
    return new BaseResponsePresenter(
      `messages.survey.UPDATED_SUCESSFULLY|{"name":"${dataDto.name}"}`,
      updSurvey,
    );
  }

  private async validateUpdate(
    surveyId: number,
    dataDto: UpdateSurveyDto,
  ): Promise<{ newData: SurveyUpdateModel | null; survey: SurveyModel }> {
    const survey = await this.surveyRepo.canUpdate(surveyId);

    const newData: SurveyUpdateModel = {};
    if (dataDto.name !== undefined && dataDto.name !== survey.name) {
      newData.name = dataDto.name;
    }
    if (
      dataDto.description !== undefined &&
      dataDto.description !== survey.description
    ) {
      newData.description = dataDto.description;
    }
    if (dataDto.active !== undefined && dataDto.active !== survey.active) {
      newData.active = dataDto.active;
    }

    if (Object.keys(newData).length === 0) {
      return { newData: null, survey };
    }
    return { newData, survey };
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    payload: SurveyUpdateModel,
  ): Promise<SurveyPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      operatorId,
      raffleId: surveyId,
      payload,
    });

    await this.dataSource.transaction(async (em) => {
      const updSurvey = await this.surveyRepo.update(surveyId, payload, em);
      if (updSurvey) {
        return false;
      }
      return updSurvey;
    });
    const survey = await this.surveyRepo.getById(surveyId);
    return new SurveyPresenter(survey);
  }

  private getForUpdate(personDb, dataDto): PersonUpdateModel {
    const personUpd: PersonUpdateModel = {};
    if (dataDto.firstName && dataDto.firstName !== personDb.firstName) {
      personUpd.firstName = dataDto.firstName;
    }
    if (dataDto.middleName && dataDto.middleName !== personDb.middleName) {
      personUpd.middleName = dataDto.middleName;
    }
    if (dataDto.lastName && dataDto.lastName !== personDb.lastName) {
      personUpd.lastName = dataDto.lastName;
    }
    if (
      dataDto.secondLastName &&
      dataDto.secondLastName !== personDb.secondLastName
    ) {
      personUpd.secondLastName = dataDto.secondLastName;
    }
    if (
      dataDto.dateOfBirth &&
      formatDateTimeToIsoString(dataDto.dateOfBirth) !==
      formatDateTimeToIsoString(personDb.dateOfBirth)
    ) {
      personUpd.dateOfBirth = dataDto.dateOfBirth;
    }
    if (dataDto.gender && dataDto.gender !== personDb.gender) {
      personUpd.gender = dataDto.gender;
    }

    if (Object.keys(personUpd).length === 0) {
      return personUpd;
    }
    return null;
  }
}
