import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { ApiLoggerService } from '../logger/logger.service';
import { MailSeqLoggerAdapter } from './mail-seq-logger-adapter';
export const getMailModuleOptions = (
  envCfgServ: EnvironmentConfigService,
  myLogger: ApiLoggerService,
) => {
  const options = {
    transport: {
      host: envCfgServ.getSmtpAddress(),
      port: envCfgServ.getSmtpPort(),
      secure: !envCfgServ.getSmtpEnableStartTls(),
      auth: {
        user: envCfgServ.getSmtpUserName(),
        pass: envCfgServ.getSmtpPassword(),
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
        minVersion: 'TLSv1.2',
      },
      debug: envCfgServ.getSmtpDebug(),
      logger: new MailSeqLoggerAdapter(myLogger),
    },
    defaults: {
      from: `"${envCfgServ.getSmtpFromUser()}" <${envCfgServ.getSmtpFromAddress()}>`,
    },
    // dist\src\infrastructure\services\mail\templates
    template: {
      dir: path.join(__dirname, '/templates'),
      adapter: new HandlebarsAdapter(),
      options: {
        strict: true,
        htmlMinifierOptions: false,
      },
    },
  };
  //* console.log(`////-- Mail Conf --${JSON.stringify(options, null, 2)}--////`);
  return options;
};
