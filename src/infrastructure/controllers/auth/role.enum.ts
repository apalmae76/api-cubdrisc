export enum EAppRoles {
  MEDIC = 'medic',
  ADMIN = 'admin',
  SYSTEM = 'SYSTEM',
}

export enum EAppRolesForUpd {
  MEDIC = 'medic',
  ADMIN = 'admin',
}

export const cRolesAppGrantAccess = {
  app: [EAppRoles.MEDIC],
  web: [EAppRoles.MEDIC],
  panel: [EAppRoles.ADMIN],
};
