import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { OperatorsActionModel } from 'src/domain/model/operatorsActions';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

export class LockUserPresenter {
  @ApiProperty()
  id: number;

  @ApiProperty()
  public reason: string;

  @ApiProperty()
  public details: object;

  constructor(data: OperatorsActionModel) {
    this.id = data.id;
    this.reason = data.reason;
    this.details = data.details;
  }
}

export class PostLockUserPresenter extends BaseResponsePresenter<LockUserPresenter> {
  @ApiProperty({
    description: 'Bock user data',
    type: LockUserPresenter,
  })
  @Type(() => LockUserPresenter)
  data: LockUserPresenter;
}
