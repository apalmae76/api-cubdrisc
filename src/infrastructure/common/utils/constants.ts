export const SYSTEM_USER_ID = 0;
export const RE_ID_CUBAN_ID = /^[0-9]{11}$/;
export const RE_PARTIAL_CUBAN_ID = /^\d{2,11}$/;
export const RE_INT_NUMBER = /^[1-9]\d*$/;
export const RE_STR_OF_INT_NUMBERS = /^(\d+,)*\d+$/;
export const RE_INT_NUMBER_INCLUDE_0 = /^[0-9]\d*$/;
export const RE_FLOAT_NUMBER = /^[-+]?[0-9]+(\.[0-9]+)?$/;
export const RE_FLOAT_2_DECIMALS = /^\d+$|^\d+(?:\.\d{0,2})$/;
export const RE_TEXT = /^[^\d]*$/;
export const RE_FULL_NAME = /\w+(\s\w+)+/;
export const RE_PHONE = /^\+[0-9]{8,15}$/;
export const RE_MOBILE_CU = /^\+535[0-9]{7}$|^\+5363[0-9]{6}$/;
export const RE_LAND_LINE_CU = /^\+53[0-9]{8}$/;
export const RE_PHONE_CU = /^\+535[0-9]{7}$|^\+5363[0-9]{6}$|^\+53[0-9]{8}$/;
export const RE_BOOLEAN = /^true$|^false$/;
export const RE_HEX_COLOR = /^#?([a-f0-9]{6})$/;

export const RE_OTP = /[0-9]{6}$/;
export const RE_ISO_2 = /^[A-Z]{2}$/;
export const RE_ISO_DATE =
  /^[0-9]{4}-(((0[13578]|(10|12))-(0[1-9]|[1-2][0-9]|3[0-1]))|(02-(0[1-9]|[1-2][0-9]))|((0[469]|11)-(0[1-9]|[1-2][0-9]|30)))$/;
export const RE_NAUTA_ACCOUNT = /^[a-z0-9._%+-]{1,33}@nauta\.com\.cu$/i;
export const RE_CVV_NUMBER = /^[0-9]{3,4}$/;
export const RE_EXP_CARD_DATE = /^(0[1-9]|1[0-2])\/\d{4}$/;
export const RE_EMAIL_LENGTHS = /^[^\s@]{1,64}@[^@\s]{1,190}$/;

export const CUBA_COUNTRY_ID = 56;
export const US_COUNTRY_ID = 233;
export const CU_COUNTRY_CODE = '+53';
export const US_COUNTRY_CODE = '+1';

export const TESTING_USER_EMAIL = 'testing@tesis.edu';

export enum EAppTypes {
  app = 'app',
  web = 'web',
  panel = 'panel',
}

export const eAppTypesValues = Object.values(EAppTypes).map((v) => v);

export enum EAppTypesCfgs {
  app = 'app',
  web = 'web',
}

export const eAppTypesCfgsValues = Object.values(EAppTypesCfgs).map((v) => v);

export enum EAppLanguages {
  es = 'es',
  en = 'en',
}

export const eEAppLanguages = Object.values(EAppLanguages).map((v) => v);

export enum EMonth {
  JAN = '01',
  FEB = '02',
  MAR = '03',
  APR = '04',
  MAY = '05',
  JUN = '06',
  JUL = '07',
  AUG = '08',
  SEP = '09',
  OCT = '10',
  NOV = '11',
  DEC = '12',
}

export const monthTypesValues = Object.values(EMonth)
  .map((v) => `"${v}"`)
  .join(', ');

export enum EPostgresErrorCode {
  UniqueViolation = '23505',
  CheckViolation = '23514',
  NotNullViolation = '23502',
  ForeignKeyViolation = '23503',
}

//  Admin - Operators / Actions ---------------
export enum EOperatorsActions {
  USER_LOCK = 1,
  USER_UNLOCK = 2,
  ADD_USER_ROLE = 3,
  REMOVE_USER_ROLE = 4,
}
