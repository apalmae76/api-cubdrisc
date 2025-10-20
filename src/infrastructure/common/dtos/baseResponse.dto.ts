import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { I18nContext } from 'nestjs-i18n';

import { PageMetaDto } from './pageMeta.dto';

export interface ITechnicalErrorInfo<T> {
  technicalError: string;
  errorsDetails: T;
}

export class BasePersonalizedErrorPresenter {
  @ApiProperty({
    description: `Especific personalized error code`,
    example: 'PO-06',
  })
  code: string;
  constructor(code: string) {
    this.code = code;
  }
}

export class BaseResponsePresenter<T> {
  @ApiProperty()
  data: T | null;

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
    isArray: true,
    type: () => String,
  })
  errors: string[] = [];

  constructor(
    message: string,
    data: T | null = null,
    translate = true,
    errors: string[] | null = null,
  ) {
    this.data = typeof data === 'number' ? (Number(data) as T) : data;

    if (translate) {
      if (message === 'AUTO') {
        const isDataAnObject = typeof data === 'object';
        const isDataDefined = data !== null && data !== undefined;
        const isDataWithTotal =
          isDataDefined && isDataAnObject && 'total' in data;
        const isNoDataMessage = !isDataDefined
          ? true
          : isDataWithTotal
            ? data.total === 0
            : isDataAnObject
              ? Object.keys(data).length === 0
              : Array.isArray(data)
                ? data.length === 0
                : false;

        this.message = isNoDataMessage
          ? 'messages.common.NO_DATA'
          : 'messages.common.DATA_GET_SUCCESSFULLY';
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
    this.errors = errors ?? [];
  }
}

export class GenericTechnicalErrorResponse<T>
  extends BaseResponsePresenter<object>
  implements ITechnicalErrorInfo<T> {
  @ApiProperty({
    nullable: true,
    required: false,
    type: 'string',
    example: 'Some text related to the error with the technical details',
  })
  technicalError: string | null;

  @ApiProperty({ required: false, nullable: true })
  errorsDetails: T | null;
}

export class BaseBadRequestPersonalizedResponse extends BaseResponsePresenter<object> {
  @ApiProperty({
    type: 'integer',
    example: 400,
  })
  statusCode: number;
  constructor() {
    super('Bad request', {}, false);
    this.statusCode = 400;
  }
}

export class ErrorDetailsPOPresenter {
  @ApiProperty()
  code: string;

  @ApiProperty({ type: 'integer' })
  referenceId: number;

  @ApiProperty({ type: 'integer' })
  serviceTypeId: number;

  @ApiProperty({ nullable: true, type: 'integer' })
  serviceReferenceId: number;

  @ApiProperty({ required: false, nullable: true })
  cardLastFour?: string;

  @ApiProperty({ required: false, nullable: true })
  timeLeft?: string;
}
export class BaseResponseWithPOPresenter<T> extends BaseResponsePresenter<T> {
  @ApiProperty({
    type: ErrorDetailsPOPresenter,
    required: false,
  })
  errorsDetails?: ErrorDetailsPOPresenter;
}

export class PaginationResponse {
  @ApiProperty({ type: 'integer' })
  total: number;
  @ApiProperty({ type: 'integer' })
  page: number;
  @ApiProperty({ type: 'integer' })
  take: number;
  @ApiProperty({ type: 'integer' })
  pageCount: number;
  @ApiProperty({ type: 'integer' })
  itemPageCount: number;
  @ApiProperty()
  hasPreviousPage: boolean;
  @ApiProperty()
  hasNextPage: boolean;
  constructor(meta: PageMetaDto) {
    this.total = Number(meta.total);
    this.page = meta.page;
    this.take = meta.take;
    this.pageCount = meta.pageCount;
    this.itemPageCount = meta.itemPageCount;
    this.hasPreviousPage = meta.hasPreviousPage;
    this.hasNextPage = meta.hasNextPage;
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

export class EmptyDataResponsePresenter extends BaseResponsePresenter<null> {
  @ApiProperty({
    description: 'Will always be null',
    nullable: true,
    example: null,
  })
  data: null;
  constructor(message: string) {
    super(message, null);
  }
}

export class GetSimpleResponsePresenter extends BaseResponsePresenter<SimpleResponsePresenter> {
  @ApiProperty({
    description: '',
    type: SimpleResponsePresenter,
  })
  data: SimpleResponsePresenter;
  constructor(message: string, data: SimpleResponsePresenter) {
    super(message, data);
  }
}

export class BooleanDataResponsePresenter extends BaseResponsePresenter<boolean> {
  @ApiProperty({
    description: 'Indicates result: true is successfull',
    type: 'boolean',
    example: true,
  })
  data: boolean;
  constructor(message: string, data: boolean, translate = true) {
    super(message, data, translate);
  }
}

export class GenericDataResponsePresenter extends BaseResponsePresenter<object> {
  @ApiProperty({
    description: 'Object of unknown entity',
    type: Object,
  })
  data: object;
  constructor(message: string, data: object, translate = true) {
    super(message, data, translate);
  }
}
export class BasicErrorDetail {
  @ApiProperty({ description: 'Personalized error code', example: 'PO-06' })
  code: string;

  @ApiProperty({
    description: 'Personalized description for user',
    example: 'Comuniquese con soporte',
    required: false,
    nullable: true,
  })
  description?: string;

  constructor(code: string) {
    this.code = code;
  }
}

export class BasicBadRequestResponse<
  T extends BasicErrorDetail,
> extends BaseResponsePresenter<object> {
  @ApiProperty({ type: 'integer' })
  statusCode: number;

  @ApiProperty({
    type: BasicErrorDetail,
    required: false,
    nullable: true,
  })
  errorsDetails?: T;
  constructor(errorsDetails: T) {
    super('Bad Request', {}, false);
    this.statusCode = 400;
    this.errorsDetails = errorsDetails;
  }
}
