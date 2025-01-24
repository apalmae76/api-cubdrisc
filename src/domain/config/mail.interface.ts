export interface IMailConfig {
  getSmtpAddress(): string;
  getSmtpPort(): number;
  getSmtpAutentication(): string;
  getSmtpEnableStartTls(): boolean;
  getSmtpUserName(): string;
  getSmtpPassword(): string;
  getSmtpFromAddress(): string;
  getSmtpFromUser(): string;
  getSmtpDebug(): boolean;
  getSmtpLogger(): boolean;
}
