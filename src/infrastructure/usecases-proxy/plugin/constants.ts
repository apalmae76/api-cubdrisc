/* eslint-disable @typescript-eslint/no-explicit-any */
import { InjectionToken, Type } from '@nestjs/common';
export const DYNAMIC_PROVIDERS = new Map<InjectionToken, any>();
export const dynamicProviderReflectorKey = 'dynamic:provider';
export const injectTokenReflectorKEy = 'inject:token';
export const optionalParamReflectorKey = 'optional:params';
export const USE_CASE_TOKENS = new Map<Type<any>, string | symbol>();
