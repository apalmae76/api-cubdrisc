import { ISendMailOptions } from '@nestjs-modules/mailer';

export interface IMailService {
  sendMail(sendMailOptions: ISendMailOptions);
  sendOtpMailCode(email: string, code: string);
}
