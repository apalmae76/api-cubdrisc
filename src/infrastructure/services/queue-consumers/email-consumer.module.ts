import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ApiLoggerModule } from '../logger/logger.module';
import { EmailService } from '../mail/mail.service';
import { EmailConsumer } from './email.consumer';

@Module({
  providers: [EmailConsumer, EmailService],
  imports: [
    ApiLoggerModule,
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: 15000, // retry in 30 segs
      },
    }),
  ],
  exports: [EmailConsumer, BullModule],
})
export class EmailConsumerModule {}
