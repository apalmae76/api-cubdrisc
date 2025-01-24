export interface IMarkServiceAsPaid {
  id: string;
  serviceId: number | string;
  amount: number | string;
  proccessingCharge: number | string;
  transactionNumber: string;
  paymentType?: 'None' | 'WebPaid' | 'ExtraCharge';
  //None, WebPaid, ExtraCharge
}
