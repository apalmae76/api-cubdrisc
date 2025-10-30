export class StateCreateModel {
  name: string;
  code: string;
}

export class StateModel extends StateCreateModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
