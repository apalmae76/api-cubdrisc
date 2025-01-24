/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { I18nContext } from 'nestjs-i18n';

export class BaseResponsePresenter<T> {
  @ApiProperty()
  data: T;
  @ApiProperty({
    description: 'User message',
    example: 'Some text related to the operation',
  })
  message: string;
  @ApiProperty({
    description: 'User errors message',
    example: [
      'Some text related to errors that occurred during the execution of the operation',
    ],
  })
  errors: [string];

  constructor(message, data: any = null, translate = true, errors = null) {
    this.data = data || {};
    if (translate) {
      if (message === 'AUTO') {
        this.message =
          data &&
          (data.total ||
            (data.total === undefined && Object.keys(data).length > 0))
            ? 'messages.common.DATA_GET_SUCCESSFULLY'
            : 'messages.common.NO_DATA';
      } else {
        this.message = message;
      }
      const i18n = I18nContext.current();
      const [key, argsString] = this.message.split('|');
      const args = argsString ? JSON.parse(argsString) : {};
      const translMessage = i18n.translate(key, { args }).toString();
      this.message = translMessage;
    } else {
      this.message = message;
    }
    this.errors = errors || [];
  }
}

export class SimpleResponsePresenter {
  @ApiProperty()
  @IsBoolean()
  response: boolean;

  constructor(result: boolean) {
    this.response = result;
  }
}

export class GetSimpleResponsePresenter extends BaseResponsePresenter<SimpleResponsePresenter> {
  @ApiProperty({
    description: '',
    type: SimpleResponsePresenter,
  })
  @Type(() => SimpleResponsePresenter)
  data: SimpleResponsePresenter;
}

export class DelBaseResultPresenter extends BaseResponsePresenter<boolean> {
  @ApiProperty({
    description: 'Indicates result: true is successfull',
    type: 'boolean',
    example: true,
  })
  data: boolean;
}
