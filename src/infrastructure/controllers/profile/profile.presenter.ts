import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { UserModel } from 'src/domain/model/user';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { formatDateToIsoString } from 'src/infrastructure/common/utils/format-date';

export class ProfileUserPresenter {
  @ApiProperty()
  @IsString()
  ci: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty({ nullable: true, required: false })
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  secondLastName: string;

  @ApiProperty()
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty()
  @IsString()
  gender: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ nullable: true })
  @IsString()
  email: string;

  constructor(user: UserModel) {
    this.ci = user.ci;
    this.fullName = user.fullName;
    this.firstName = user.firstName;
    this.middleName = user.middleName || null;
    this.lastName = user.lastName;
    this.secondLastName = user.secondLastName;
    this.dateOfBirth = formatDateToIsoString(user.dateOfBirth);
    this.gender = user.gender;
    this.phone = user.phone;
    this.email = user.email;
  }
}

export class GetUserPresenter extends BaseResponsePresenter<ProfileUserPresenter> {
  @ApiProperty({
    description: 'User data',
    type: ProfileUserPresenter,
  })
  @Type(() => ProfileUserPresenter)
  data: ProfileUserPresenter;
}
