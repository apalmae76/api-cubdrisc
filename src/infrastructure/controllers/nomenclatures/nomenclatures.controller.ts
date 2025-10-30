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
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { UseCaseProxy } from 'src/infrastructure/usecases-proxy/usecases-proxy';
import { TerritoriesUseCases } from 'src/usecases/territories/territories.usecases';
import { GetStatesPresenter } from './nomenclatures.presenter';

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

  @Get('states')
  @ApiOkResponse({ type: GetStatesPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows to obtain the States',
    operationId: 'getStates',
  })
  async getStates(): Promise<GetStatesPresenter> {
    const response = await this.getTerritoriesUC.getInstance().getStates();
    const total = response ? response.length : 0;
    return new BaseResponsePresenter('AUTO', { states: response, total });
  }
}
