export class PersonCreateModel {
  ci: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  dateOfBirth: Date;
  gender: string;
}
export class PersonUpdateModel {
  ci?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  fullName?: string;
  dateOfBirth?: Date;
  gender?: string;
}

export class PersonModel extends PersonCreateModel {
  id: number;
  fullName: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
