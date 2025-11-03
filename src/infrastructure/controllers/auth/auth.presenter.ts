import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, IsUUID } from 'class-validator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

export class IsAuthPresenter {
  @ApiProperty()
  @IsNumber()
  userId: number;
}

export class GetAuthTokensPresenter {
  @ApiProperty()
  @IsString()
  accessToken: string;

  @ApiProperty()
  @IsString()
  refreshToken: string;

  @ApiProperty()
  @IsString()
  userName?: string;

  @ApiProperty()
  @IsString()
  userId?: number;

  @ApiProperty()
  @IsString()
  email?: string;

  constructor(
    accesToken: string,
    refreshToken: string,
    userName: string = null,
    userId: number = null,
    email: string = null,
  ) {
    this.accessToken = accesToken;
    this.refreshToken = refreshToken;
    if (userName) {
      this.userName = userName;
    }
    if (userId) {
      this.userId = userId;
    }
    if (email) {
      this.email = email;
    }
  }
}

export class RefreshTokenPresenter {
  @ApiProperty()
  @IsUUID()
  accessToken: string;
  @ApiProperty()
  @IsString()
  refreshToken: string;

  @ApiProperty()
  @IsString()
  userId?: number;

  @ApiProperty()
  @IsString()
  email?: string;

  constructor(
    accesToken: string,
    refreshToken: string,
    userId: number = null,
    email: string = null,
  ) {
    this.accessToken = accesToken;
    this.refreshToken = refreshToken;
    if (userId) {
      this.userId = userId;
    }
    if (email) {
      this.email = email;
    }
  }
}

export class GetRefreshTokenPresenter extends BaseResponsePresenter<RefreshTokenPresenter> {
  @ApiProperty({
    description: 'Refresh token data',
    type: RefreshTokenPresenter,
  })
  @Type(() => RefreshTokenPresenter)
  data: RefreshTokenPresenter;
}
