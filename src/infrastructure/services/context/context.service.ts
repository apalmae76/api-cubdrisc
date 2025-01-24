/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { CLS_ID, ClsService } from 'nestjs-cls';
import ContextStorageService from './context.interface';

@Injectable()
export default class NestjsClsContextStorageService
  implements ContextStorageService
{
  constructor(private readonly cls: ClsService) {}

  public get<T>(key: string): T | undefined {
    try {
      return this.cls.get(key);
    } catch (er) {
      return undefined;
    }
  }

  public setContextId(id: string) {
    try {
      this.cls.set(CLS_ID, id);
    } catch (er) {
      // TODO check places where its not defined
      // console.log('Error, CLS not initialized, CHECK (setContextId)');
      return;
    }
  }

  public getContextId(): string | undefined {
    try {
      return this.cls.getId();
    } catch (er) {
      return undefined;
    }
  }

  public set<T>(key: string, value: T): void {
    try {
      this.cls.set(key, value);
    } catch (er) {
      return;
    }
  }
}
