/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import {
  RolesGuard,
} from 'src/infrastructure/common/guards/role.guard';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

import { CurrentUser } from 'src/infrastructure/common/decorators/current-user.decorator';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { GetGenericInfoUseCases } from 'src/usecases/admin/get-generic-info.usecases';
import {
  GetGenericAllDto,
  GetGenericDetailDto,
  operatorsList,
} from '../../common/dtos/genericRepo-dto.class';
import { AuthUser } from '../auth/auth-user.interface';
import { EAppRoles } from '../auth/role.enum';
@ApiTags('System configuration')
@Controller()
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard([EAppRoles.ADMIN, EAppRoles.MEDIC]))
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class AdminConfigSystemController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(GetGenericInfoUseCases)
    private readonly genericUC: UseCaseProxy<GetGenericInfoUseCases>,
  ) { }

  @Get('entity/enums')
  @ApiOperation({
    description: `
    `,
    summary: `Allows you to obtain the ENUMS of the entities linked to the panel`,
    operationId: 'adminSystemGetEnums',
  })
  async getEnums(): Promise<BaseResponsePresenter<any>> {
    return this.genericUC.getInstance().getEnums();
  }

  @Get('entity')
  @ApiOperation({
    description: `**entityName:** Allows you to express the entity-table to consult. Those available are visible in the list.
    
    IMPORTANT: Each entity will return a list of predetermined attributes, and the same ones will be the ones that can be used in the filters and the order.
    There are other attributes not visible in the response object, which could be used as filters. See note at the end.

    \n\n**filter:** Optional. Will contain the list of attributes to use as a filter. It will be an string in json format as:

    For example: 
      - In users, using endswith: filter=[{"atr":"firstName","op":"endswith","value":"er"},{"atr":"balance","op":">","value":"100"}]
      - In paymentOperations, using in: filter=[{"atr":"serviceTypeId","op":"in","value":["TOPUP","REMITTANCE"]}]
      - In paymentOperations, using between: filter=[{"atr":"updatedAt","op":"between","value":["2024-08-01","2024-08-10"]}]
          Timestamp values can be sent including or not the time value.

    Aviable operators are: ${operatorsList.join(', ')}
    
    \n\n**sort:** Optional. Will contain the list of attributes to use as ORDER BY. It will be an array of elements of type key: value
    
    For example: sort=[{"selector":"balance","desc":true}]

    IMPORTANTE: If not specified, the result will be ordered by the updatedAt attribute in a DESC manner
    
    \n\n**page:** Optional. Pagination options. Represents the page we want to display, 1 by default

    Accepts only positive integers. Minimum value will be 1.

    \n\n**take** Optional. Pagination options. Represents the number of elements to list on each page, 10 by default
    
    Accepts only positive integers. Minimum value will be 1. Maximum value will be 100

    \n\n**Example:** For users entity    
    
    http://[base url]/entity?page=1&take=10&entityName=users&sort=[{"selector":"balance","desc":true}]&filter=[{"atr":"firstName","op":"endswith","value":"er"},{"atr":"balance","op":">","value":"1000"}]
    
    \n\n**Attention** Attributes to use as filters, which are not visible in the query results
    
    userId: present in all entities with the user object in their result, also in device and ipInfo (integer value)
    countryId, cityId, stateId: present in all entities, with country, city and/or state attribute(s) in their result (except ipInfo) (integer value). Example: addresses
    cardId: present in paymentOperations and paymentTransactions (integer value)
    paymentOperationId: present in balanceHistory, paymentTransactions and paymentRefunds (integer value)
    deviceId: present in ipInfo (integer value)
    ipId: present in devices as (integer value)
    toAll: present in notifications (boolean value)
    opActionId: present in devices and cards (integer value)
    
    `,
    summary: `Allows operators, to obtain all info of entity X`,
    operationId: 'adminSystemGetEntity',
  })
  async adminSystemGetEntity(
    @CurrentUser() user: AuthUser,
    @Query() dataDto: GetGenericAllDto,
  ): Promise<BaseResponsePresenter<any>> {
    return this.genericUC.getInstance().getAll(user.id, dataDto);
  }

  @Get('entity/details')
  @ApiOperation({
    description: `**entityName:** Allows you to express the entity-table to consult. Those available are visible in the list.
    
    IMPORTANT: Each entity will return a list of predetermined attributes, and the same ones will be the ones that can be used in the filters and the order.
    There are other attributes not visible in the response object, which could be used as filters. See note at the end.

    \n\n**filter:** Optional. Will contain the list of attributes to use as a filter. It will be an string in json format as:
    `,
    summary: `Allows you to obtain the ENUMS of the entities linked to the panel`,
    operationId: 'adminSystemGetEntityDetail',
  })
  async adminSystemGetEntityDetail(
    @CurrentUser() user: AuthUser,
    @Query() dataDto: GetGenericDetailDto,
  ): Promise<BaseResponsePresenter<any>> {
    return this.genericUC.getInstance().getDetails(user.id, dataDto);
  }
}
