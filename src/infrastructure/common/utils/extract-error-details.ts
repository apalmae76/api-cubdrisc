import { HttpException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ExtractedError {
  message: string;
  status?: number;
}

export type ApiResponseError = {
  response: {
    message: string;
  };
  status: number;
  options: object;
};

export type ApiMessageError = {
  message: string;
};

export type AxiosError<T> = {
  response: {
    data: T;
    status: number;
  };
};

export type GenericAxiosError = AxiosError<object>;
const isAxiosError = (error: unknown): error is GenericAxiosError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  );
};

const isApiResponseError = (error: unknown): error is ApiResponseError => {
  return (
    typeof error === 'object' &&
    'response' in error &&
    typeof error.response === 'object' &&
    'message' in error.response &&
    'status' in error &&
    typeof error.status === 'number' &&
    'options' in error &&
    typeof error.options === 'object'
  );
};

const isApiQueryError = (error: unknown): error is ApiMessageError => {
  return (
    error &&
    typeof error === 'object' &&
    'driverError' in error &&
    'query' in error
  );
};

const isApiMessageError = (error: unknown): error is ApiMessageError => {
  return error && typeof error === 'object' && 'message' in error;
};

export function extractErrorDetails(
  er: unknown,
  defaultError: string | null = null,
  debug = false,
): ExtractedError {
  let message: string;
  let status: number | undefined;
  if (debug) {
    console.log(`Error type is: -${typeof er}-`);
    console.log(`Error message is: -${(er as any).message}-`);
    console.log(er);
  }
  if (
    isAxiosError(er) &&
    'message' in er.response.data &&
    typeof er.response.data.message === 'string'
  ) {
    if (debug) {
      console.log(`Flow take: -isAxiosError-`);
    }
    message = er.response.data.message;
    status = er.response.status;
  } else if (isApiResponseError(er)) {
    if (debug) {
      console.log(`Flow take: -isApiResponseError-`);
    }
    message = er.response.message;
    status = er.status;
  } else if (isApiQueryError(er)) {
    if (debug) {
      console.log(`Flow take: -isApiQueryError-`);
    }
    message = `QueryFailedError: ${(er as any).message}`;
    status = 422;
  } else if (isApiMessageError(er)) {
    if (debug) {
      console.log(`Flow take: -isApiMessageError-`);
    }
    message = (er as any).message;
    status = (er as any).status ?? undefined;
    if (
      !status &&
      typeof (er as any).response === 'object' &&
      (er as any).response !== null &&
      'data' in (er as any).response &&
      'status' in (er as any).response &&
      typeof (er as any).response.status === 'number'
    ) {
      status = (er as any).response.data.status ?? undefined;
    }
  } else if (er instanceof Error) {
    if (debug) {
      console.log(`Flow take: -er instanceof Error-`);
    }
    message = er.message;
    status = (er as any).status ?? undefined;
  } else if (er instanceof QueryFailedError) {
    if (debug) {
      console.log(`Flow take: -er instanceof QueryFailedError-`);
    }
    message = er.message;
    status = (er as any).status ?? undefined;
  } else if (typeof er === 'string') {
    if (debug) {
      console.log(`Flow take: -typeof er === 'string'-`);
    }
    message = er;
    status = (er as any).status ?? undefined;
  } else {
    if (debug) {
      console.log(`Flow take: -last else-`);
    }
    message = defaultError ?? 'No message was available (?)';
    status = (er as any).status ?? undefined;
  }

  if (!status && (er instanceof HttpException || message.includes('401'))) {
    status = er instanceof HttpException ? er.getStatus() : 401;
    if (debug) {
      console.log(`Status was undefined: -last value was: ${status}-`);
    }
  }
  if (debug) {
    console.log(`message: ${message}`);
    console.log(`status: ${status}-`);
  }
  return { message, status };
}
