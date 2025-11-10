import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

import { CurrentFreeUser } from 'src/infrastructure/common/decorators/current-user.decorator';
import RoleGuard from 'src/infrastructure/common/guards/role.guard';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { CreateUserUseCases } from 'src/usecases/admin/createUser.usecases';
import { ManageUsersRole } from 'src/usecases/admin/manageUsersRole.usecases';
import { UpdateUserUseCases } from 'src/usecases/admin/updateUser.usecases';
import {
  ValidRoleDto,
  ValidUserIdDto,
} from '../../common/dtos/admin-dto.class';
import { AuthUser } from '../auth/authUser.interface';
import {
  EAppRoles,
  EAppRolesForUpd,
  cRolesAppGrantAccess,
} from '../auth/role.enum';
import { ProfileUserDto } from '../profile/profile-dto.class';
import {
  GetUserPresenter,
  ProfileUserPresenter,
} from '../profile/profile.presenter';

@ApiTags('Users')
@Controller('user')
@ApiBearerAuth('JWT')
@UseGuards(RoleGuard(EAppRoles.ADMIN))
@ApiBadRequestResponse({ description: 'Bad request' })
@ApiUnauthorizedResponse({ description: 'No authorization token was found' })
@ApiNotFoundResponse({
  description:
    'Attempt to access a resource that cannot be found or has not been registered',
})
@ApiInternalServerErrorResponse({ description: 'Internal error' })
export class AdminUsersController {
  constructor(
    protected readonly appConfig: EnvironmentConfigService,
    @InjectUseCase(CreateUserUseCases)
    private readonly createUserProxyUC: UseCaseProxy<CreateUserUseCases>,
    @InjectUseCase(UpdateUserUseCases)
    private readonly updateUserProxyUC: UseCaseProxy<UpdateUserUseCases>,
    @InjectUseCase(ManageUsersRole)
    private readonly manageUserRoleUC: UseCaseProxy<ManageUsersRole>,
  ) { }

  @Post()
  @ApiCreatedResponse({ type: BaseResponsePresenter<GetUserPresenter> })
  @ApiBody({ type: ProfileUserDto })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to create new users',
    operationId: 'createUser',
  })
  async createUser(
    @Body() dataDto: ProfileUserDto,
    @CurrentFreeUser() user: AuthUser,
  ): Promise<BaseResponsePresenter<ProfileUserPresenter>> {
    const newUser = await this.createUserProxyUC
      .getInstance()
      .execute(user, dataDto);
    return newUser;
  }

  @Patch('/:toUserId')
  @ApiOkResponse({ type: GetUserPresenter })
  @ApiOperation({
    description: '',
    summary: 'Allows admins, to update user data',
    operationId: 'updateUser',
  })
  @ApiParam({
    name: 'toUserId',
    type: 'number',
    example: 34,
    description: 'User ID that will be affected',
  })
  async updateUser(
    @Body() dataDto: ProfileUserDto,
    @Param() { toUserId }: ValidUserIdDto,
    @CurrentFreeUser() user: AuthUser,
  ): Promise<BaseResponsePresenter<ProfileUserPresenter>> {
    return await this.updateUserProxyUC
      .getInstance()
      .execute(user, toUserId, dataDto);
  }

  @Patch('/:toUserId/role/:role/add')
  @ApiOkResponse({ type: Boolean })
  @ApiOperation({
    description: '',
    summary: 'Allows system administrators to assign a role to a user',
    operationId: 'userAssignRole',
  })
  @ApiParam({
    name: 'toUserId',
    type: 'number',
    example: 34,
    description: 'User ID that will be affected',
  })
  @ApiParam({
    name: 'role',
    enum: EAppRolesForUpd,
    example: EAppRoles.ADMIN,
    description: `Aviable system roles. Possible values: ${cRolesAppGrantAccess.panel}`,
  })
  async userAssignRole(
    @CurrentFreeUser() user: AuthUser,
    @Param() { toUserId }: ValidUserIdDto,
    @Param() { role }: ValidRoleDto,
  ): Promise<BaseResponsePresenter<boolean>> {
    return await this.manageUserRoleUC
      .getInstance()
      .addUserRole(user, toUserId, role);
  }

  @Patch('/:toUserId/role/:role/remove')
  @ApiOkResponse({ type: Boolean })
  @ApiOperation({
    description: '',
    summary: 'Allows system administrators to remove a role to a user',
    operationId: 'userRemoveRole',
  })
  @ApiParam({
    name: 'toUserId',
    type: 'number',
    example: 34,
    description: 'User ID that will be affected',
  })
  @ApiParam({
    name: 'role',
    enum: EAppRolesForUpd,
    example: EAppRoles.ADMIN,
    description: `Aviable system roles. Possible values: ${cRolesAppGrantAccess.panel}`,
  })
  async userRemoveRole(
    @CurrentFreeUser() user: AuthUser,
    @Param() { toUserId }: ValidUserIdDto,
    @Param() { role }: ValidRoleDto,
  ): Promise<BaseResponsePresenter<boolean>> {
    return await this.manageUserRoleUC
      .getInstance()
      .removeUserRole(user, toUserId, role);
  }
}
