import { City } from './city.entity';
import { Country } from './country.entity';
import { UserEmails } from './emails.entity';
import { MedicalSpecialty } from './medicalSpecialty.entity';
import { OperatorsActions } from './operatorsActions.entity';
import { Patient } from './patient.entity';
import { Person } from './person.entity';
import { UserPhones } from './phone.entity';
import { State } from './state.entity';
import { User } from './user.entity';

export const ENTITIES = [
  Person,
  User,
  Patient,
  UserPhones,
  UserEmails,
  MedicalSpecialty,
  OperatorsActions,
  Country,
  State,
  City,
];
