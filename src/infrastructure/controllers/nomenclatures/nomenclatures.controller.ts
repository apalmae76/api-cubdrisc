import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { UseCaseProxy } from 'src/infrastructure/usecases-proxy/usecases-proxy';
import { TerritoriesUseCases } from 'src/usecases/territories/territories.usecases';
import {
  GetTCitiesDto,
  GetTCountriesDto,
  GetTStatesDto,
} from '../../common/dtos/nomenclatures-dto.class';
import {
  GetCitiesPresenter,
  GetCountriesPresenter,
  GetStatesPresenter
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
export class NomencladoresController {
  constructor(
    @InjectUseCase(TerritoriesUseCases)
    private readonly getTerritoriesUC: UseCaseProxy<TerritoriesUseCases>,
  ) { }

  @Get('countries')
  @ApiOkResponse({ type: GetCountriesPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows to obtain the Countries',
    operationId: 'getCountries',
  })
  async getCountries(
    @Query() dataDto: GetTCountriesDto,
  ): Promise<GetCountriesPresenter> {
    const response = await this.getTerritoriesUC
      .getInstance()
      .getCountries(dataDto);
    const total = response ? response.length : 0;
    return new BaseResponsePresenter('AUTO', { countries: response, total });
  }

  @Get('states')
  @ApiOkResponse({ type: GetStatesPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows to obtain the States',
    operationId: 'getStates',
  })
  async getStates(
    @Query() dataDto: GetTStatesDto,
  ): Promise<GetStatesPresenter> {
    const response = await this.getTerritoriesUC
      .getInstance()
      .getStates(dataDto);
    const total = response ? response.length : 0;
    return new BaseResponsePresenter('AUTO', { states: response, total });
  }

  @Get('cities')
  @ApiOkResponse({ type: GetCitiesPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows to obtain the Cities',
    operationId: 'getCities',
  })
  async getCities(
    @Query() dataDto: GetTCitiesDto,
  ): Promise<GetCitiesPresenter> {
    const response = await this.getTerritoriesUC
      .getInstance()
      .getCities(dataDto);
    const total = response ? response.length : 0;
    return new BaseResponsePresenter('AUTO', { cities: response, total });
  }
}
