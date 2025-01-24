import { EntityIdName } from './user';

export class UserEmailCreateModel {
  userId: number;
  emailAddress: string;
}
export class UserEmailModel extends UserEmailCreateModel {
  id: number;
  createdAt: Date;
}

export class UserEmailPanelModel {
  id: number;
  user: EntityIdName;

  emailAddress: string;
  createdAt: Date;
}
