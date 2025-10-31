export class PatientCreateModel {
  personId: number;
  diagnosed: Date;
}
export class PatientUpdateModel {
  diagnosed?: Date;
}

export class PatientModel extends PatientCreateModel {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
