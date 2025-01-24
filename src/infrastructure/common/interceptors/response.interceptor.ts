import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class ResponseFormat<T> {
  @ApiProperty()
  data: T;
  @ApiProperty()
  message: string;
  @ApiProperty()
  errors: [];
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    return next.handle().pipe(
      map((data) => {
        //* console.log('////ResponseInterceptor////');
        //* console.log(data);
        //* console.log('////////////-------///////////////');
        //* const data = Object.entries(obj).filter(([key]) => key !== 'message')
        return {
          data,
          message: data.message || '',
          errors: [],
        };
      }),
    );
  }
}
