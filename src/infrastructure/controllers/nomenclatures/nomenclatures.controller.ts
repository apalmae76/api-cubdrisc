import { Controller, Get } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { UseCaseProxy } from 'src/infrastructure/usecases-proxy/usecases-proxy';
import { MedicalSpecialtiesUseCases } from 'src/usecases/nomenclatures/medicalSpecialties.usecases';
import { TerritoriesUseCases } from 'src/usecases/nomenclatures/territories.usecases';
import {
  GetMedicalSpecialtiesPresenter,
  GetStatesPresenter,
} from './nomenclatures.presenter';

@ApiTags('Nomenclatures')
@Controller('nomenclatures')
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class NomenclaturesController {
  constructor(
    @InjectUseCase(TerritoriesUseCases)
    private readonly getTerritoriesUC: UseCaseProxy<TerritoriesUseCases>,
    @InjectUseCase(MedicalSpecialtiesUseCases)
    private readonly getMedSpecUC: UseCaseProxy<MedicalSpecialtiesUseCases>,
  ) { }

  @Get('states')
  @ApiOkResponse({ type: GetStatesPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows to obtain the States',
    operationId: 'getStates',
  })
  async getStates(): Promise<GetStatesPresenter> {
    return await this.getTerritoriesUC.getInstance().getStates();
  }

  @Get('medical-specialties')
  @ApiOkResponse({ type: GetMedicalSpecialtiesPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows to obtain the medical specialties',
    operationId: 'getMedicalSpecialties',
  })
  async getMedicalSpecialties(): Promise<GetMedicalSpecialtiesPresenter> {
    return await this.getMedSpecUC.getInstance().getMedicalSpecialties();
  }
}
