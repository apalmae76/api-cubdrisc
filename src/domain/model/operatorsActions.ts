import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EntityIdName, EntityIdStrName } from './user';

export class OperatorsActionCreateModel {
  operatorId: number;
  toUserId: number | null;
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
  user: EntityIdName;
  action: EntityIdStrName;
  reason: string;
  details: object;

  createdAt: Date;
}

export enum EOperatorsActionsES {
  USER_LOCK = 'Bloquear usuario',
  USER_UNLOCK = 'Desbloquear usuario',
  USER_CREDIT_BALANCE = 'Crédito de saldo',
  USER_DEBIT_BALANCE = 'Débito de saldo',
  USER_COMPLETE_PAYMENT = 'Completar pago',
  USER_REFUND_PAYMENT = 'Devolver pago',
  USER_VOID_PAYMENT = 'Cancelar pago',
  PAYMENT_GATEWAY_CREATE = 'Crear pasarela',
  PAYMENT_GATEWAY_UPDATE = 'Modificar pasarela',
  PAYMENT_GATEWAY_DELETE = 'Eliminar pasarela',
  REMITTANCE_CONFIG_UPD = 'Modificar configuración de remesa',
  PROMOTIONS_INSERT = 'Adicionar promoción',
  PROMOTIONS_UPDATE = 'Modificar promoción',
  PROMOTIONS_DELETE = 'Eliminar promoción',
  PAYMENT_RULE_CREATE = 'Adicionar regla de pago del sistema',
  PAYMENT_RULE_UPDATE = 'Modificar regla de pago del sistema',
  PAYMENT_USER_RULE_CREATE = 'Adicionar regla de pago a usuario',
  PAYMENT_USER_RULE_UPDATE = 'Modificar regla de pago a usuario',
  PAYMENT_USER_RULE_DELETE = 'Eliminar regla de pago a usuario',
  USER_SYNC_DATA = 'Sincronizar datos de usuario',
  SERVICE_CONFIG_UPD = 'Modificar configuración de servicio',
  SYSTEM_CONFIG_UPD = 'Modificar configuración de sistema',
  SYSTEM_USER_CONFIG_UPD = 'Modificar configuración de usuario',
  SERVICE_FOR_SALE_SYNC = 'Sincronizar datos de servicios de remesa',
  ADD_USER_ROLE = 'Adicionar rol a usuario',
  REMOVE_USER_ROLE = 'Eliminar rol a usuario',
  PRODUCTS_CATEGORIES_SYNC = 'Sincronizar datos de categorías de productos',
  STORE_PROVIDER_ENABLE = 'Habilitar proveedor de tienda',
  STORE_PROVIDER_DISABLE = 'Deshabilitar proveedor de tienda',
  STORE_CATEGORY_CREATE = 'Adicionar categoría de productos (tienda)',
  STORE_CATEGORY_UPDATE = 'Modificar categoría de productos (tienda)',
  STORE_CATEGORY_DELETE = 'Eliminar categoría de productos (tienda)',
  STORE_CATEGORY_RELATE = 'Relacionar categoría de productos (tienda)',
  DELIVERY_POINTS_SYNC = 'Sincronizar puntos de entrega',
  LOCKER_PACKAGE_SET_RECEIVED = 'Casillero/Paquete; marcar como recibido',
  LOCKER_PACKAGE_REVERT = 'Casillero/Paquete; desmarcar como recibido',
  USER_VERIFY_PAYMENT = 'Indicar verificar pago a usuario',
  TOPUP_SERVICE_SYNC = 'Sincronizar datos de recargas',
  PAYMENT_GATEWAY_RECOVER = 'Recuperar pasarela de pago eliminada',
  APPLY_PAYMENT_RULE_ACTION = 'Aplicar acción de regla de pago',
}
