/* eslint-disable @typescript-eslint/no-explicit-any */

import { InjectionToken, Type } from '@nestjs/common';
import { DYNAMIC_PROVIDERS, dynamicProviderReflectorKey } from './constants';
import { IUseCaseProviderData } from './interface/use-case-provider.interface';

export function registerProvider<T extends Type<any>>(
  provider: T,
  token: InjectionToken,
) {
  if (!DYNAMIC_PROVIDERS.has(token)) {
    DYNAMIC_PROVIDERS.set(token, provider);
  }
}

export function loadProxyModuleMeta(): {
  meta: IUseCaseProviderData[];
} {
  const providers = Array.from(DYNAMIC_PROVIDERS.values());
  const metaMap = new Map<InjectionToken, IUseCaseProviderData>();
  providers.forEach((provider) => {
    const meta: IUseCaseProviderData = Reflect.getMetadata(
      dynamicProviderReflectorKey,
      provider,
    );
    if (meta) {
      metaMap.set(meta.token, meta);
    }
  });
  const metaArray = Array.from(metaMap.values());

  return { meta: metaArray };
}
