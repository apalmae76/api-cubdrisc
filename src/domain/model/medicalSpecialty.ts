export class MedicalSpecialtyCreateModel {
  id: number;
  name: string;
}

export class MedicalSpecialtyModel extends MedicalSpecialtyCreateModel {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
