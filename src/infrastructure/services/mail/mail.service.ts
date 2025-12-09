import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Inject, Injectable } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { IMailService } from 'src/domain/adapters/mail.interface';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';
// TODO include with templates later
// import formatDate from '../../common/utils/formatDate';
// import imgToBase64 from '../../common/utils/img-to-base-64';

@Injectable()
export class EmailService implements IMailService {
  private context: string = `${EmailService.name}.`;
  private readonly personalizedErrors: ReadonlyArray<string> = [
    '504 5.7.4 Unrecognized authentication type',
    '421 4.3.2 Service not active',
    'Connection timeout',
  ] as const;
  constructor(
    private readonly mailerService: MailerService,
    @Inject(API_LOGGER_KEY) private readonly logger: IApiLogger,
  ) { }

  async sendMail(sendMailOptions: ISendMailOptions): Promise<string> {
    const context = `${this.context}sendMail`;
    this.logger.debug(`Starting`, {
      context,
      sendMailOptions: {
        to: sendMailOptions.to,
        subject: sendMailOptions.subject,
        html: 'XXX',
      },
    });
    try {
      const response = await this.mailerService.sendMail(sendMailOptions);
      this.logger.debug(`Ended`, {
        context,
        response,
      });
      return response.messageId || '';
    } catch (er: unknown) {
      return this.handleError(er, { context });
    }
  }

  private handleError(er: unknown, logData: object): string {
    const { message } = extractErrorDetails(er);
    const contextTitle: string = `Ends with errors: ${message}`;
    if (message) {
      if (this.personalizedErrors.some((msg) => message.includes(msg))) {
        this.logger.warn(contextTitle, {
          ...logData,
          message: `${MailerService.name}: ${message}`,
        });
      } else {
        this.logger.error(contextTitle, {
          ...logData,
          message: `${MailerService.name}: ${message}`,
        });
      }
    } else {
      this.logger.error(`Ends with errors; CHECK`, {
        ...logData,
        message: `${MailerService.name}: Cant get message error; CHECK`,
      });
    }
    return '';
  }

  async sendOtpMailCode(email: string, code: string) {
    let message = `messages.login.SEND_EMAIL_OTP_CODE|{"code":"${code}"}`;
    const i18n = I18nContext.current();
    const [key, argsString] = message.split('|');
    const args = argsString ? JSON.parse(argsString) : {};
    message = i18n
      ? i18n.translate(key, { args })
      : `<p>Su código de acceso a CUBDRISC es: <b>${code}</b></p>`;

    const mailMessage: ISendMailOptions = {
      subject: i18n
        ? i18n.translate('SEND_EMAIL_OTP_CODE_SUBJECT')
        : 'Código de acceso',
      to: email,
      html: message,
    };
    await this.sendMail(mailMessage);
  }
}
