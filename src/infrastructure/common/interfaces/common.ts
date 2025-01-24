export interface keyValue {
  key: unknown;
  value: number;
  description?: string;
  default?: string;
  min?: boolean;
  max?: boolean;
}

export interface KeyValueObjectList<T> {
  [key: string]: T;
}

export interface KeyValueArrayOfObjectList<T> {
  [key: string]: T[];
}

export interface Key2ValueObjectList<T> {
  [key: string]: KeyValueObjectList<T>;
}
