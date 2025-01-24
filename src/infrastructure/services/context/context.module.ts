import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { ContextStorageServiceKey } from './context.interface';
import NestjsClsContextStorageService from './context.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) =>
          req.headers['correlation-id'] ?? uuidv4(),
      },
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: ContextStorageServiceKey,
      useClass: NestjsClsContextStorageService,
    },
  ],
  exports: [ContextStorageServiceKey],
})
export class ContextModule {}
