import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EntityIdName, EntityIdStrName } from './user';

export class OperatorsActionCreateModel {
  operatorId: number;
  actionId: EOperatorsActions;
  reason: string;
  details?: object;
}

export class OperatorsActionModel extends OperatorsActionCreateModel {
  id: number;
  createdAt?: Date;
}

export class OperatorsActionPanelModel {
  id: number;
  operator: EntityIdName;
  action: EntityIdStrName;
  reason: string;
  details: object;

  createdAt: Date;
}

export enum EOperatorsActionsES {
  USER_LOCK = 'Bloquear usuario',
  USER_UNLOCK = 'Desbloquear usuario',
  ADD_USER_ROLE = 'Adicionar rol',
  USER_CREATE = 'Crear usuario',
  USER_UPDATE = 'Modificar usuario',
  USER_DELETE = 'Deshabilitar usuario',
  REMOVE_USER_ROLE = 'Eliminar rol',
  SURVEY_CREATE = 'Crear test',
  SURVEY_UPDATE = 'Modificar test',
  SURVEY_DELETE = 'Eliminar test',
  SURVEY_ACTIVE = 'Activar test',
  SURVEY_QUESTION_CREATE = 'Crear pregunta',
  SURVEY_QUESTION_UPDATE = 'Modificar pregunta',
  SURVEY_QUESTION_DELETE = 'Eliminar pregunta',
  SURVEY_QUESTION_MOVE = 'Mover pregunta',
  SURVEY_QUESTION_ANSWER_CREATE = 'Crear respuesta',
  SURVEY_QUESTION_ANSWER_UPDATE = 'Modificar respuesta',
  SURVEY_QUESTION_ANSWER_DELETE = 'Eliminar respuesta',
  SURVEY_QUESTION_ANSWER_MOVE = 'Mover respuesta',
  SURVEY_RISK_CALCULATION_CREATE = 'Crear regla de cálcuo de riesgo',
  SURVEY_RISK_CALCULATION_UPDATE = 'Modificar regla de cálcuo de riesgo',
  SURVEY_RISK_CALCULATION_DELETE = 'Eliminar regla de cálcuo de riesgo',
  SURVEY_RISK_CALCULATION_MOVE = 'Mover regla de cálcuo de riesgo',
}
