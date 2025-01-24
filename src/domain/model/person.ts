export class PersonUpdateModel {
  ci: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  fullName?: string;
  dateOfBirth: Date;
  gender: string;
}

export class PersonCreateModel extends PersonUpdateModel {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
export class PersonModel extends PersonCreateModel {
  id: number;
}
