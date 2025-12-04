import { BadRequestException } from '@nestjs/common';
import { addYears, differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonCreateModel, PersonUpdateModel } from 'src/domain/model/person';
import {
  PersonSurveyCreateModel,
  PersonSurveyUpdateModel,
} from 'src/domain/model/personSurvey';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { formatDateTimeToIsoString } from 'src/infrastructure/common/utils/format-date';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  CreatePersonSurveyDto,
  PatchPersonSurveyDto,
  PatchPersonSurveyIMCDto,
} from 'src/infrastructure/controllers/patient/person-answer-dto.class';
import {
  GetPersonSurveyPresenter,
  PersonSurveyPresenter,
} from 'src/infrastructure/controllers/patient/person-survey.presenter';
import { DatabasePersonSurveyRepository } from 'src/infrastructure/repositories/person-survey.repository';
import { DatabasePersonRepository } from 'src/infrastructure/repositories/person.repository';
import { DatabaseStateRepository } from 'src/infrastructure/repositories/state.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UseCaseBase } from '../usecases.base';

type CreatePersonSurvey = {
  person?: PersonCreateModel;
  personUpd?: PersonUpdateModel;
  personSurvey: PersonSurveyCreateModel;
  personCi: string;
};

@InjectableUseCase()
export class ManagePersonSurveyUseCases extends UseCaseBase {
  private readonly surveyTtl: number = 4 * 60 * 60; // 4 hours
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly personRepo: DatabasePersonRepository,
    private readonly personSurveyRepo: DatabasePersonSurveyRepository,
    private readonly stateRepo: DatabaseStateRepository,
    private readonly redisService: ApiRedisService,
    private readonly appConfig: EnvironmentConfigService,
    private readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManagePersonSurveyUseCases.name}.`;
  }

  @UseCaseLogger()
  async create(
    dataDto: CreatePersonSurveyDto,
  ): Promise<GetPersonSurveyPresenter> {
    const createData = await this.validateCreate(dataDto);
    if (createData.personSurvey === null) {
      const data: PatchPersonSurveyDto = {
        referenceId: createData.personCi, // use ci field to get referenceId
        ...dataDto,
      };
      return await this.update(data);
    }
    const patientSurvey = await this.persistCreate(createData);
    return new BaseResponsePresenter(
      `messages.person_survey.CREATED_SUCESSFULLY|{"identityCardNumber":"${dataDto.ci}"}`,
      patientSurvey,
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
              technicalError: `Person (${personDb.id}), has a valid test; next test can be taken from ${date}`,
            };
            throw new BadRequestException({
              message: [
                `validation.person_survey.HAS_VALID_TEST|${JSON.stringify(args)}`,
              ],
            });
          }
        } else {
          // take update flow
          this.logger.verbose(
            'Person survey was initiated allready, take update',
            {
              context: `${this.context}validateCreate`,
              personSurvayData: lastTest,
            },
          );
          const referenceId = uuidv4();
          const cacheKey = this.getCacheKey(referenceId);
          const surveyData = new PersonSurveyPresenter(
            referenceId,
            dataDto.ci,
            dataDto.gender,
            lastTest.personId,
            lastTest.surveyId,
            lastTest.id,
          );
          await this.redisService.set(cacheKey, surveyData, this.surveyTtl);
          const response: CreatePersonSurvey = {
            personCi: surveyData.referenceId,
            personSurvey: null, // use this as flag
          };
          return response;
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
      personCi: dataDto.ci,
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

  private async persistCreate(
    data: CreatePersonSurvey,
  ): Promise<PersonSurveyPresenter> {
    const personSurvey = await this.dataSource.transaction(async (em) => {
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
      return personSurvey;
    });
    const referenceId = uuidv4();
    const cacheKey = this.getCacheKey(referenceId);
    const surveyData = new PersonSurveyPresenter(
      referenceId,
      data.personCi,
      data.person.gender,
      personSurvey.personId,
      personSurvey.surveyId,
      personSurvey.id,
    );
    await this.redisService.set(cacheKey, surveyData, this.surveyTtl);
    return surveyData;
  }

  private getCacheKey(referenceId: string): string {
    return `System:PatientSurvey:${referenceId}`;
  }

  @UseCaseLogger()
  async update(
    dataDto: PatchPersonSurveyDto,
  ): Promise<GetPersonSurveyPresenter> {
    const context = `${this.context}update`;
    const { personSurveyData, newPersonData, newPersonSurveyData } =
      await this.validateUpdate(dataDto);

    if (newPersonData === null && newPersonSurveyData === null) {
      const response = new BaseResponsePresenter(
        `messages.person_survey.UPDATED_SUCESSFULLY|{"identityCardNumber":"${dataDto.ci}"}`,
        personSurveyData,
      );
      return this.handleNoChangedValuesOnUpdate(
        context,
        response,
        this.appConfig.isProductionEnv(),
      );
    }

    const updSurvey = await this.persistData(
      personSurveyData,
      newPersonData,
      newPersonSurveyData,
    );
    return new BaseResponsePresenter(
      `messages.person_survey.UPDATED_SUCESSFULLY|{"identityCardNumber":"${dataDto.ci}"}`,
      updSurvey,
    );
  }

  private async validateUpdate(dataDto: PatchPersonSurveyDto): Promise<{
    personSurveyData: PersonSurveyPresenter;
    newPersonData: PersonUpdateModel | null;
    newPersonSurveyData: PersonSurveyUpdateModel | null;
  }> {
    const personSurveyData = await this.validateBase(dataDto.referenceId);

    const { personId, surveyId, personSurveyId } = personSurveyData;
    const [person, personSurvey] = await Promise.all([
      this.personRepo.getByIdOrFail(personId),
      this.personSurveyRepo.getByIdOrFail(surveyId, personId, personSurveyId),
      this.surveyRepo.getByIdOrFail(surveyId),
    ]);

    const newPersonData = this.getForUpdate(person, dataDto);
    const newPersonSurveyData: PersonSurveyUpdateModel = {};

    if (newPersonData && newPersonData.dateOfBirth) {
      const today = new Date();
      newPersonSurveyData.age = differenceInYears(today, dataDto.dateOfBirth);
    }
    // person survey data
    if (
      dataDto.stateId !== undefined &&
      dataDto.stateId !== personSurvey.stateId
    ) {
      newPersonSurveyData.stateId = dataDto.stateId;
    }
    if (dataDto.phone !== undefined && dataDto.phone !== personSurvey.phone) {
      newPersonSurveyData.phone = dataDto.phone;
    }
    if (dataDto.email !== undefined && dataDto.email !== personSurvey.email) {
      newPersonSurveyData.email = dataDto.email;
    }

    const updPersonSurvey =
      Object.keys(newPersonSurveyData).length === 0
        ? null
        : newPersonSurveyData;

    const response = {
      personSurveyData,
      newPersonData,
      newPersonSurveyData: updPersonSurvey,
    };

    return response;
  }

  async persistData(
    personSurveyData: PersonSurveyPresenter,
    newPersonData: PersonUpdateModel | null,
    newPersonSurveyData: PersonSurveyUpdateModel | null,
  ): Promise<PersonSurveyPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      personSurveyData,
      newPersonData,
      newPersonSurveyData,
    });
    const { personId, surveyId, personSurveyId } = personSurveyData;
    await this.dataSource.transaction(async (em) => {
      if (newPersonData) {
        await this.personRepo.update(personId, newPersonData, em);
      }
      if (newPersonSurveyData) {
        await this.personSurveyRepo.update(
          personId,
          surveyId,
          personSurveyId,
          newPersonSurveyData,
          em,
        );
      }
    });
    const cacheKey = this.getCacheKey(personSurveyData.referenceId);
    await this.redisService.set(cacheKey, personSurveyData, this.surveyTtl);
    return personSurveyData;
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

  @UseCaseLogger()
  async updateIMC(
    dataDto: PatchPersonSurveyIMCDto,
  ): Promise<GetPersonSurveyPresenter> {
    const context = `${this.context}updateIMC`;
    const { personSurveyData, newPersonSurveyData } =
      await this.validateUpdateIMC(dataDto);

    if (newPersonSurveyData === null) {
      const response = new BaseResponsePresenter(
        `messages.person_survey.UPDATED_SUCESSFULLY|{"identityCardNumber":"${personSurveyData.personCi}"}`,
        personSurveyData,
      );
      return this.handleNoChangedValuesOnUpdate(
        context,
        response,
        this.appConfig.isProductionEnv(),
      );
    }

    const updSurvey = await this.persistIMCData(
      personSurveyData,
      newPersonSurveyData,
    );
    return new BaseResponsePresenter(
      `messages.person_survey.UPDATED_SUCESSFULLY|{"identityCardNumber":"${personSurveyData.personCi}"}`,
      updSurvey,
    );
  }

  private async validateUpdateIMC(dataDto: PatchPersonSurveyIMCDto): Promise<{
    personSurveyData: PersonSurveyPresenter;
    newPersonSurveyData: PersonSurveyUpdateModel | null;
  }> {
    const personSurveyData = await this.validateBase(dataDto.referenceId);

    const { personId, surveyId, personSurveyId } = personSurveyData;
    const [personSurvey] = await Promise.all([
      this.personSurveyRepo.getByIdOrFail(surveyId, personId, personSurveyId),
      this.personRepo.getByIdOrFail(personId),
      this.surveyRepo.getByIdOrFail(surveyId),
    ]);

    const newPersonSurveyData: PersonSurveyUpdateModel = {};

    if (dataDto.weight !== personSurvey.weight) {
      newPersonSurveyData.weight = dataDto.weight;
    }
    if (dataDto.size !== personSurvey.size) {
      newPersonSurveyData.size = dataDto.size;
    }

    const updPersonSurvey =
      Object.keys(newPersonSurveyData).length === 0
        ? null
        : newPersonSurveyData;
    if (updPersonSurvey) {
      const sizeMts = dataDto.size / 100;
      updPersonSurvey.imcValue = Number(
        (dataDto.weight / (sizeMts * sizeMts)).toFixed(2),
      );
      if (updPersonSurvey.imcValue < 25) {
        updPersonSurvey.imcPoints = 0;
        updPersonSurvey.imcCategory = 'Normal';
      } else if (
        updPersonSurvey.imcValue >= 25 &&
        updPersonSurvey.imcValue <= 30
      ) {
        updPersonSurvey.imcPoints = 1;
        updPersonSurvey.imcCategory = 'Sobrepeso';
      } else {
        // more than 30
        updPersonSurvey.imcPoints = 3;
        updPersonSurvey.imcCategory = 'Obesidad';
      }
    }

    const response = {
      personSurveyData,
      newPersonSurveyData: updPersonSurvey,
    };

    return response;
  }

  async persistIMCData(
    personSurveyData: PersonSurveyPresenter,
    newPersonSurveyData: PersonSurveyUpdateModel | null,
  ): Promise<PersonSurveyPresenter> {
    const context = `${this.context}persistIMCData`;
    this.logger.debug('Saving data', {
      context,
      personSurveyData,
      newPersonSurveyData,
    });
    const { personId, surveyId, personSurveyId } = personSurveyData;
    if (newPersonSurveyData) {
      await this.personSurveyRepo.update(
        personId,
        surveyId,
        personSurveyId,
        newPersonSurveyData,
        null,
      );
    }
    const cacheKey = this.getCacheKey(personSurveyData.referenceId);
    await this.redisService.set(cacheKey, personSurveyData, this.surveyTtl);
    return personSurveyData;
  }

  async validateBase(referenceId: string): Promise<PersonSurveyPresenter> {
    const cacheKey = this.getCacheKey(referenceId);
    const personSurveyData =
      await this.redisService.get<PersonSurveyPresenter>(cacheKey);

    if (!personSurveyData) {
      const args = {
        technicalError: `Patient survey relation (${referenceId}) does not exist or data expired`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.NOT_EXIST_OR_EXPIRED|${JSON.stringify(args)}`,
        ],
      });
    }
    return personSurveyData;
  }
}
