import { EntityIdName } from './user';

export class IPhoneReg {
  phone: string;
  countryCode: string;
}

export class IVerifyPhoneOTP {
  phone: string;
  otpCode: number;
}
export class PhoneAddDataModel {
  nationalFormat: string;
  countryIso2: string;
  mobileCountryCode: string;
  mobileNetworkCode: string;
  carrierName: string;
  isMobileNumber: boolean;
  isMobileFromActiveCountryCode?: boolean;
}
export class UserPhonesCreateModel extends PhoneAddDataModel {
  userId: number;
  phone: string;
}

export class UserPhonesModel extends UserPhonesCreateModel {
  id: number;
  createdAt: Date;
}

export class UserPhonesPanelModel {
  id: number;
  user: EntityIdName;

  phone: string;
  nationalFormat: string;
  countryIso2: string;
  mobileCountryCode: string;
  mobileNetworkCode: string;
  carrierName: string;
  isMobileNumber: boolean;

  createdAt: Date;
}
