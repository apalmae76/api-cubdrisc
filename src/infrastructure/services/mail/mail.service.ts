import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { IMailService } from 'src/domain/adapters/mail.interface';
// TODO include with templates later
// import formatDate from '../../common/utils/formatDate';
// import imgToBase64 from '../../common/utils/img-to-base-64';

@Injectable()
export class EmailService implements IMailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(sendMailOptions: ISendMailOptions): Promise<string> {
    // TODO include with templates later
    //sendMailOptions.context = {
    //  ...sendMailOptions.context,
    //  $: {
    //    imgToBase64,
    //    formatDate,
    //  },
    //};
    const response = await this.mailerService.sendMail(sendMailOptions);
    return response.messageId || '';
  }

  async sendOtpMailCode(email: string, code: string) {
    let message = `messages.login.SEND_EMAIL_OTP_CODE|{"code":"${code}"}`;
    const i18n = I18nContext.current();
    const [key, argsString] = message.split('|');
    const args = argsString ? JSON.parse(argsString) : {};
    message = i18n.translate(key, { args });

    const mailMessage: ISendMailOptions = {
      subject: i18n.translate('SEND_EMAIL_OTP_CODE_SUBJECT'),
      to: email,
      html: message,
    };
    await this.sendMail(mailMessage);
  }
}
