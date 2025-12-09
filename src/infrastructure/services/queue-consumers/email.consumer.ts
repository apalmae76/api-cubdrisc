import { Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Job } from 'bull';
import { CLS_ID, UseCls } from 'nestjs-cls';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { v4 as uuidv4 } from 'uuid';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';
import { EmailService } from '../mail/mail.service';

@Processor('email')
export class EmailConsumer {
  constructor(
    @Inject(API_LOGGER_KEY) private readonly logger: IApiLogger,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) { }

  @Process()
  @UseCls({
    setup(cls, job) {
      cls.set(CLS_ID, job.data?.correlationId || uuidv4());
    },
  })
  async send(job: Job<EmailJobData>) {
    let contextTitle = `[BULL-WORKER] Job with id={jobId}, sending {mailType} email to {to}: `;
    const context = 'EmailConsumer.send';
    const { mailOptions, mailType } = job.data;
    const now = Date.now();
    this.logger.verbose(`${contextTitle}Starting`, {
      context,
      jobId: job.id,
      to: mailOptions.to,
      subject: mailOptions.subject,
      mailType,
    });
    try {
      await this.emailService.sendMail(mailOptions);
      this.logger.verbose(
        `${contextTitle}Finish, success, duration={duration}ms`,
        {
          context,
          jobId: job.id,
          to: mailOptions.to,
          mailType,
          duration: Date.now() - now,
        },
      );
      return true;
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      const logData = {
        context: `${context}.catch`,
        jobId: job.id,
        to: mailOptions.to,
        mailType,
        message,
        duration: Date.now() - now,
      };
      contextTitle = `${contextTitle}Ends with error, duration={duration}ms`;
      if (
        message &&
        (message.includes('504 5.7.4 Unrecognized authentication type') ||
          message.includes('421 4.3.2 Service not active'))
      ) {
        this.logger.warn(contextTitle, logData);
      } else {
        this.logger.error(contextTitle, logData);
      }
      throw new Error(message);
    }
  }
}
