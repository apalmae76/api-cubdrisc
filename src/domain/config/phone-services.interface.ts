export interface IPhoneServicesConfig {
  getInnoveritApiUrl(): string;
  getInnoveritApiKey(): string;

  getTwilioAccountSid(): string;
  getTwilioAuthToken(): string;
  getTwilioFromNumber(): string;

  getTwilioApiUrlCallback(): string;
}
