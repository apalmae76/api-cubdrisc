import { ISendMailOptions } from '@nestjs-modules/mailer';

export interface EmailJobData {
  mailType: string;
  mailOptions: ISendMailOptions;
  correlationId?: string;
}
