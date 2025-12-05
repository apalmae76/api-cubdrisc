import { BadRequestException } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { PatientCreateModel } from 'src/domain/model/patient';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { DiagnosePersonDto } from 'src/infrastructure/controllers/admin/manage-patient-dto.class';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabasePatientRepository } from 'src/infrastructure/repositories/patient.repository';
import { DatabasePersonSurveyRepository } from 'src/infrastructure/repositories/person-survey.repository';
import { DatabasePersonRepository } from 'src/infrastructure/repositories/person.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import ContextStorageService, {
  ContextStorageServiceKey,
} from 'src/infrastructure/services/context/context.interface';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectWithToken } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-with-token.decorator';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

class DiagnoseData {
  personId: number;
  surveyId: number;
  personSurveyId: number;

  isDiagnosed: boolean;

  medicId: number;
  medicEmail: string;
  medicFullName?: string;
  medicalSpecialtyId: number;
  medicalSpecialtyName?: string;

  surveyName: string;
  personFullName?: string;
  personEmail: string;
}

@InjectableUseCase()
export class DiagnosePersonUseCases extends UseCaseBase {
  constructor(
    private readonly personRepo: DatabasePersonRepository,
    private readonly personSurveyRepo: DatabasePersonSurveyRepository,
    private readonly userRepo: DatabaseUserRepository,
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly patientRepo: DatabasePatientRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    private readonly redisService: ApiRedisService,
    @InjectWithToken(ContextStorageServiceKey)
    private readonly contextStorageService: ContextStorageService,
    private readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${DiagnosePersonUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute({
    operatorId,
    personId,
    surveyId,
    personSurveyId,
    dataDto,
    emailSyncQueue,
  }: {
    operatorId: number;
    personId: number;
    surveyId: number;
    personSurveyId: number;
    dataDto: DiagnosePersonDto;
    emailSyncQueue: Queue<EmailJobData>;
  }): Promise<BooleanDataResponsePresenter> {
    const diagnoseData = await this.validate(
      operatorId,
      personId,
      surveyId,
      personSurveyId,
      dataDto,
    );

    await this.persistData(diagnoseData, dataDto);
    await this.sendDiagnosedEmail(diagnoseData, emailSyncQueue);
    const msg = dataDto.diagnosed ? 'DIAGNOSE_OK' : 'DIAGNOSE_REMOVED';
    return new BooleanDataResponsePresenter(
      `messages.person_survey.${msg}|{"personId":"${personId}"}`,
      true,
    );
  }

  private async validate(
    operatorId: number,
    personId: number,
    surveyId: number,
    personSurveyId: number,
    dataDto: DiagnosePersonDto,
  ): Promise<DiagnoseData> {
    if (dataDto.diagnosed === false) {
      await this.patientRepo.ensureExistOrFail(
        personId,
        surveyId,
        personSurveyId,
      );
    } else {
      const patient = await this.patientRepo.getById(
        personId,
        surveyId,
        personSurveyId,
      );
      if (patient) {
        const args = {
          personId,
          surveyId,
          personSurveyId,
          technicalError: `Patient has already been diagnosed, please check the data and try again`,
        };
        throw new BadRequestException({
          message: [
            `validation.patient.ALREADY_DIAGNOSED|${JSON.stringify(args)}`,
          ],
        });
      }
    }

    const personSurvey = await this.personSurveyRepo.getByIdOrFail(
      personId,
      surveyId,
      personSurveyId,
    );
    // validate imc calulation
    if (dataDto.diagnosed && !personSurvey.imcValue) {
      const args = {
        technicalError: `BMI has not been calculated, return the user to step 2 to continue`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.MISSING_IMC|${JSON.stringify(args)}`,
        ],
      });
    }

    const [survey, user] = await Promise.all([
      this.surveyRepo.getByIdOrFail(surveyId),
      this.userRepo.getByIdOrFail(operatorId),
    ]);

    const response: DiagnoseData = {
      personId,
      surveyId,
      personSurveyId,

      isDiagnosed: dataDto.diagnosed,

      medicId: operatorId,
      medicEmail: user.email,
      medicalSpecialtyId: user.medicalSpecialtyId,

      surveyName: survey.name,
      personEmail: personSurvey.email,
    };
    return response;
  }

  async persistData(
    diagnoseData: DiagnoseData,
    dataDto: DiagnosePersonDto,
  ): Promise<DiagnoseData> {
    const context = `${this.context}persistIMCData`;
    this.logger.debug('Saving data', {
      context,
      personSurvey: diagnoseData,
      dataDto,
    });
    const { personId, surveyId, personSurveyId, medicId, medicalSpecialtyId } =
      diagnoseData;

    const patientKey = {
      personId,
      surveyId,
      personSurveyId,
    };

    const patient: PatientCreateModel = {
      ...patientKey,
      medicId,
      medicalSpecialtyId,
    };

    await this.dataSource.transaction(async (em) => {
      if (dataDto.diagnosed) {
        await this.patientRepo.create(patient, em);
      } else {
        await this.patientRepo.delete(patientKey, em);
      }
      const opPayload: OperatorsActionCreateModel = {
        operatorId: medicId,
        actionId: dataDto.diagnosed
          ? EOperatorsActions.PATIENT_DIAGNOSE
          : EOperatorsActions.PATIENT_DIAGNOSE_REMOVE,
        reason: dataDto.diagnosed
          ? `Diagnosticar paciente: ${diagnoseData.personEmail}`
          : dataDto.reason,
        details: patient,
      };
      await this.operActionRepo.create(opPayload, em);
    });
    if (dataDto.diagnosed) {
      const diagnose = await this.patientRepo.getByIdForPanel(
        personId,
        surveyId,
        personSurveyId,
      );

      if (diagnose) {
        diagnoseData.personFullName = diagnose.personFullName;
        diagnoseData.medicFullName = diagnose.medicFullName;
        diagnoseData.medicalSpecialtyName = diagnose.medicalSpecialtyName;
      }
    } else {
      const [person, medic] = await Promise.all([
        this.personRepo.getById(personId),
        this.userRepo.getById(medicId),
      ]);
      diagnoseData.personFullName =
        person?.fullName ?? diagnoseData.personEmail;
      diagnoseData.medicFullName = medic?.fullName ?? diagnoseData.medicEmail;
      diagnoseData.medicalSpecialtyName = medic?.medicalSpecialty ?? '';
    }
    return diagnoseData;
  }

  private async sendDiagnosedEmail(
    diagnoseData: DiagnoseData,
    emailSyncQueue: Queue<EmailJobData>,
  ) {
    const context = `${this.context}sendDiagnosedEmail`;
    this.logger.debug(`Starting`, {
      context,
      diagnoseData,
    });
    try {
      const medic = {
        name: `Dr. ${diagnoseData.medicFullName} - ${diagnoseData.medicalSpecialtyName}`,
        contact: diagnoseData.medicEmail,
      };
      const messageBody = diagnoseData.isDiagnosed
        ? `Le comunicamos que ud ha sido diagnosticado como <b>diabético</b>.`
        : `Le comunicamos que su diagnóstico ha sido anulado.`;
      const emailOptions: EmailJobData = {
        mailOptions: {
          subject: diagnoseData.isDiagnosed
            ? 'Diagnóstico'
            : 'Diagnóstico anulado',
          to: diagnoseData.personEmail,
          template: 'person-diagnosed-es',
          context: {
            personFullName: diagnoseData.personFullName,
            testName: diagnoseData.surveyName,
            medic,
            messageBody,
            contactPhone: '78327275',
            contactAddress: 'Calle Zapata y D, Vedado, La Habana, 10400, Cuba',
          },
        },
        mailType: 'Diagnose confirmation',
        correlationId: this.contextStorageService.getContextId() ?? undefined,
      };
      const options: JobOptions = {
        backoff: 120000, // 2 mins in milliseconds,
      };
      emailSyncQueue.add(emailOptions, options);
      this.logger.debug(`Ended successfully`, {
        context,
      });
    } catch (er) {
      this.logger.verbose(`Ends with errors: {message}`, {
        context,
        message: extractErrorDetails(er).message ?? 'None',
      });
    }
  }
}
