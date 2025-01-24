export interface ITwilioService {
  sendMessage(
    to: string,
    body: string,
    transl?: boolean,
    returnNullIfNoSent?: boolean,
  ): Promise<string>;
}
