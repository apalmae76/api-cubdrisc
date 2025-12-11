/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Inject } from '@nestjs/common';
import * as IORedis from 'ioredis';
import * as os from 'os';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { AuthUser } from 'src/infrastructure/controllers/auth/auth-user.interface';
import { JwtTokenService } from '../jwt/jwt.service';
import { ApiLoggerService } from '../logger/logger.service';
import { ApiRedisService } from '../redis/redis.service';
import { RedisAdapter } from './redis-io.adapter';

export enum EAppEvents {
  BALANCE_CHANGE = 'BALANCE_CHANGE',
  USER_IS_LOCKED = 'USER_IS_LOCKED',
  ACTIVE_PROMOTION = 'ACTIVE_PROMOTION',
  MOVE_PROMOTION = 'MOVE_PROMOTION',
  DELETE_PROMOTION = 'DELETE_PROMOTION',
  THREE_D_SECURE_COMPLETE = 'THREE_D_SECURE_COMPLETE',
  // TODO see if send it to push
  REFRESH_SERVICE_FOR_SALE_FINISH = 'REFRESH_SERVICE_FOR_SALE_FINISH',
  LANGUAJE_CHANGE = 'LANGUAJE_CHANGE',
  STORE_UPDATE_CATEGORIES = 'STORE_UPDATE_CATEGORIES',
  STORE_UPDATE_CART = 'STORE_UPDATE_CART',
  SERVICE_UPDATED = 'SERVICE_UPDATED',
}

const EventsVsApps = {
  web: [
    EAppEvents.BALANCE_CHANGE,
    EAppEvents.ACTIVE_PROMOTION,
    EAppEvents.MOVE_PROMOTION,
    EAppEvents.DELETE_PROMOTION,
    EAppEvents.USER_IS_LOCKED,
    EAppEvents.THREE_D_SECURE_COMPLETE,
    EAppEvents.LANGUAJE_CHANGE,
    EAppEvents.STORE_UPDATE_CATEGORIES,
    EAppEvents.STORE_UPDATE_CART,
    EAppEvents.SERVICE_UPDATED,
  ],
  app: [
    EAppEvents.BALANCE_CHANGE,
    EAppEvents.ACTIVE_PROMOTION,
    EAppEvents.MOVE_PROMOTION,
    EAppEvents.DELETE_PROMOTION,
    EAppEvents.USER_IS_LOCKED,
    EAppEvents.THREE_D_SECURE_COMPLETE,
    EAppEvents.LANGUAJE_CHANGE,
    EAppEvents.STORE_UPDATE_CATEGORIES,
    EAppEvents.STORE_UPDATE_CART,
    EAppEvents.SERVICE_UPDATED,
  ],
  panel: [
    EAppEvents.USER_IS_LOCKED,
    EAppEvents.REFRESH_SERVICE_FOR_SALE_FINISH,
  ],
};

export const appEventsList = Object.values(EAppEvents)
  .filter((value) => typeof value === 'string')
  .map((value) => ({
    key: value,
    value: EAppEvents[value],
  }));

interface IInternalData<T> {
  sendedBy: string;
  hostname: string;
  data: T;
  userId?: number;
  appType?: EAppTypes;
  eventName?: string;
  destiny?: EAppTypes[] | null;
}

export const appEventsValues = appEventsList.map((obj) => obj.key).join(', ');
@ApiTags('Auth')
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WSService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  //* private readonly hostname = `${os.hostname()}1`; // just for local tests
  private readonly hostname = os.hostname(); // enable
  private readonly contextTitle = `Host ${this.hostname}, `;
  private readonly context = `${WSService.name}.`;
  private readonly cacheKey = `WS_CONECTED_USERS:${this.hostname}`;
  private readonly cacheTime = 24 * 60 * 60; // 24hrs
  private readonly internalChanel = 'internal';
  private readonly incListeners = 5;
  private subscribedToInternalChanel = false;
  constructor(
    private readonly logger: ApiLoggerService,
    private readonly redisClient: ApiRedisService,
    @Inject('REDIS_ADAPTER') private redisAdapter: RedisAdapter,
  ) { }

  afterInit() {
    const context = `${this.context}afterInit`;
    this.logger.verbose(`${this.contextTitle}service has been initialized`, {
      context,
    });
    const redisIOClient: IORedis.Redis = this.redisAdapter.getRedisClient();
    if (this.subscribedToInternalChanel === false) {
      redisIOClient.subscribe(
        this.internalChanel,
        (er: unknown, count: number) => {
          if (er) {
            const { message } = extractErrorDetails(er);
            this.logger.error(
              `${this.contextTitle}subscribe to RedisIO internal channel: ends with errors; {message}`,
              {
                context,
                message,
              },
            );
            return;
          }
          this.subscribedToInternalChanel = true;
          let incMaxListeners = false;
          if (count > 9) {
            redisIOClient.setMaxListeners(count + this.incListeners);
            incMaxListeners = true;
          }
          this.logger.verbose(
            `${this.contextTitle}subscribe to RedisIO internal channel: ends successfully; {count}`,
            {
              count,
              context,
              incMaxListeners,
            },
          );
        },
      );
    }

    // handle message logic
    redisIOClient.on('message', (channel, message) => {
      if (channel === this.internalChanel) {
        this.proccessInternalChanelMessage(message);
      }
    });

    // handle reconnection logic
    redisIOClient.on('reconnect', () => {
      this.logger.verbose(`${this.contextTitle}reconnected to RedisIO`, {
        context,
      });
      redisIOClient.subscribe(
        this.internalChanel,
        (er: unknown, count: number) => {
          if (er) {
            const { message } = extractErrorDetails(er);
            this.logger.error(
              `${this.contextTitle}re-subscribe to RedisIO internal channel: ends with errors; {message}`,
              {
                context,
                message,
              },
            );
            return;
          }
          let incMaxListeners = false;
          if (count > 9) {
            redisIOClient.setMaxListeners(count + this.incListeners);
            incMaxListeners = true;
          }
          this.logger.verbose(
            `${this.contextTitle}re-subscribe to RedisIO internal channel: ends successfully; {count}`,
            {
              count,
              context,
              incMaxListeners,
            },
          );
        },
      );
    });

    this.logger.verbose(
      `${this.contextTitle}checking RedisIO connection status`,
      { context },
    );
    // Check connection status periodically
    setInterval(() => {
      this.redisAdapter.getRedisClient().ping((er: unknown, result: string) => {
        if (er) {
          const { message } = extractErrorDetails(er);
          this.logger.warn(
            `${this.contextTitle}ping to RedisIO failed: {message}`,
            {
              context: `${this.context}ping`,
              result,
              message,
            },
          );
        }
      });
    }, 30000); // Every 30 seconds
  }

  private async proccessInternalChanelMessage(message) {
    const receivedData = JSON.parse(message);
    if (receivedData.hostname !== this.hostname) {
      this.logger.verbose(
        `${this.contextTitle}received data from RedisIO internal channel`,
        {
          context: `${this.context}proccessInternalChanelMessage`,
          receivedData,
        },
      );
      if (receivedData.sendedBy === 'sendToUser') {
        this.sendToUser(
          receivedData.userId,
          receivedData.data,
          receivedData.app,
          true,
        );
      } else if (receivedData.sendedBy === 'sendToUserByApp') {
        this.sendToUserByApp(
          receivedData.appType,
          receivedData.userId,
          receivedData.data,
          true,
        );
      } else if (receivedData.sendedBy === 'sendToAll') {
        this.sendToAll(receivedData.data, receivedData.destiny, true);
      }
    }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const contextTitle = `${this.contextTitle}handle connection of client ID: {clientId}; `;
    const context = `${this.context}handleConnection`;
    let token = client.handshake.headers.authorization;
    let user: AuthUser = null;
    const { sockets } = this.server.sockets;
    if (token) {
      token = token.slice(7, token.length);
      try {
        const currentUserExtractor = new JwtTokenService(new JwtService());
        const tokenData = await currentUserExtractor.checkToken(token);
        if (tokenData) {
          user = {
            id: parseInt(tokenData.userId),
            ...tokenData,
          };
        }
      } catch (er: unknown) {
        const { message } = extractErrorDetails(er);
        // TODO see what to do here
        this.logger.verbose(`${contextTitle}checking token ({message})`, {
          context,
          check: true,
          message,
        });
        user = null;
      }
      if (user) {
        const cacheKeyList = `${this.cacheKey}:LIST:${user.app}:${user.id}`;
        const connectedUsers =
          (await this.redisClient.get<string[]>(cacheKeyList)) || [];
        const cacheKeyRelation = `${this.cacheKey}:RELATION:${client.id}`;
        if (connectedUsers.includes(client.id)) {
          await this.redisClient.set<number>(
            cacheKeyRelation,
            user.id,
            this.cacheTime,
          );
        } else {
          const userId = await this.redisClient.get<number>(cacheKeyRelation);
          if (userId !== user.id) {
            connectedUsers.push(client.id);
            await this.redisClient.set<string[]>(
              cacheKeyList,
              connectedUsers,
              this.cacheTime,
            );
            await this.redisClient.set<number>(
              cacheKeyRelation,
              user.id,
              this.cacheTime,
            );
          }
        }
        let incMaxListeners = false;
        if (sockets.size > 9) {
          this.server.setMaxListeners(sockets.size + this.incListeners);
          incMaxListeners = true;
        }
        this.logger.verbose(
          `${contextTitle}user id: {userId}, from {app}; clients count: {wsClientCount}`,
          {
            context,
            args,
            user,
            app: user.app,
            wsClientCount: sockets.size,
            incMaxListeners,
            clientId: client.id,
            userId: user.id,
          },
        );
        return;
      }
    }
    let incMaxListeners = false;
    if (sockets.size > 9) {
      this.server.setMaxListeners(sockets.size + this.incListeners);
      incMaxListeners = true;
    }
    this.logger.verbose(
      `${contextTitle}only publics chanel, clients count: {wsClientCount}`,
      {
        context,
        args,
        user,
        wsClientCount: sockets.size,
        maxListeners: this.server.getMaxListeners() ?? '?',
        incMaxListeners,
        clientId: client.id,
      },
    );
    return;
  }

  private async handleDisconnectByApp(
    appType: EAppTypes,
    clientId: string,
  ): Promise<number> {
    const cacheKeyRelation = `${this.cacheKey}:RELATION:${clientId}`;
    const userId = await this.redisClient.get<number>(cacheKeyRelation);
    if (userId) {
      const cacheKeyList = `${this.cacheKey}:LIST:${appType}:${userId}`;
      const connectedUsers =
        (await this.redisClient.get<string[]>(cacheKeyList)) || [];
      const index = connectedUsers.findIndex((value) => value === clientId);
      if (index > -1) {
        if (connectedUsers && connectedUsers.length === 1) {
          this.redisClient.del(cacheKeyList);
        } else {
          connectedUsers.splice(index, 1);
          await this.redisClient.set<string[]>(
            cacheKeyList,
            connectedUsers,
            this.cacheTime,
          );
        }
        this.redisClient.del(cacheKeyRelation);
        return userId;
      }
    }
    return 0;
  }

  async handleDisconnect(client: Socket) {
    const contextTitle = `${this.contextTitle}handle disconnect of client ID: {clientId}; `;
    const context = `${this.context}handleDisconnect`;
    const clientId = client.id;
    const { sockets } = this.server.sockets;

    let decMaxListeners = false;
    let actualListeners = this.server.getMaxListeners();
    const minListeners = 10 + this.incListeners;
    if (actualListeners > minListeners) {
      actualListeners--;
      this.server.setMaxListeners(actualListeners);
      decMaxListeners = true;
    }
    let appByUser = '';
    const webUserId = await this.handleDisconnectByApp(EAppTypes.web, clientId);
    if (webUserId > 0) {
      appByUser = ` user with id ${webUserId}, from web, disconnected;`;
    }
    const appUserId = await this.handleDisconnectByApp(EAppTypes.app, clientId);
    if (appUserId > 0) {
      appByUser =
        appByUser === ''
          ? ` user with id ${appUserId} from app, disconnected;`
          : `${appByUser}, web, disconnected;`;
    }
    this.logger.verbose(
      `${contextTitle}${appByUser} clientCount: {clientCount}`,
      {
        context,
        userId: appUserId,
        clientId,
        decMaxListeners,
        actualListeners,
        clientCount: sockets.size,
      },
    );
  }

  @SubscribeMessage('public_web')
  async eventsPublicWeb(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): Promise<number> {
    const context = `${this.context}eventsPublicWeb`;
    this.logger.debug(
      `${this.contextTitle}client with ID: {clientId}, subscribe to messages; chanel [public_web]`,
      {
        context,
        clientId: client.id,
        data,
      },
    );
    return data;
  }

  @SubscribeMessage('public_app')
  async eventsPublicApp(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): Promise<number> {
    const context = `${this.context}eventsPublicApp`;
    this.logger.debug(
      `${this.contextTitle}client with ID: {clientId}, subscribe to messages; chanel [public_app]`,
      {
        context,
        clientId: client.id,
        data,
      },
    );
    return data;
  }

  private async sendToUserByApp<T>(
    appType: EAppTypes,
    userId: number,
    data: T,
    sendedByInternal = false,
  ): Promise<boolean> {
    const eventName = `private_${appType}_${userId}`;
    if (sendedByInternal === false) {
      const dataToShare: IInternalData<T> = {
        sendedBy: 'sendToUserByApp',
        hostname: this.hostname,
        appType,
        userId,
        eventName,
        data: { ...data },
      };
      this.sendToInternaChanel(dataToShare);
    }
    const cacheKeyList = `${this.cacheKey}:LIST:${appType}:${userId}`;
    const connectedUsers =
      (await this.redisClient.get<string[]>(cacheKeyList)) || [];
    if (
      connectedUsers &&
      connectedUsers.length > 0 &&
      EventsVsApps[appType] &&
      EventsVsApps[appType].includes(data['data']['event'])
    ) {
      this.server.emit(eventName, data);
      return true;
    }
    return false;
  }

  async sendToUser<T>(
    userId: number,
    data: T,
    app: EAppTypes = null,
    sendedByInternal = false,
  ): Promise<void> {
    const context = `${this.context}sendToUser`;
    let notifAppTypes = null;
    if (app) {
      if (await this.sendToUserByApp<T>(app, userId, data, true)) {
        notifAppTypes = app;
      }
    } else {
      if (await this.sendToUserByApp<T>(EAppTypes.web, userId, data, true)) {
        notifAppTypes = EAppTypes.web;
      }
      if (await this.sendToUserByApp<T>(EAppTypes.app, userId, data, true)) {
        notifAppTypes = notifAppTypes
          ? `${notifAppTypes}-${EAppTypes.app}`
          : EAppTypes.app;
      }
      if (await this.sendToUserByApp<T>(EAppTypes.panel, userId, data, true)) {
        notifAppTypes = notifAppTypes
          ? `${notifAppTypes}-${EAppTypes.panel}`
          : EAppTypes.panel;
      }
    }
    if (sendedByInternal === false) {
      const dataToShare: IInternalData<T> = {
        sendedBy: 'sendToUser',
        hostname: this.hostname,
        userId,
        appType: app,
        data: { ...data },
      };
      this.sendToInternaChanel(dataToShare);
    }
    if (notifAppTypes) {
      this.logger.debug(
        `${this.contextTitle}User is notified [private_${notifAppTypes}_${userId}]`,
        {
          context,
          appToNotify: app ? app : 'NULL',
          toApps: notifAppTypes,
          data,
        },
      );
    } else {
      const eventIsConfiguredForApp = EventsVsApps[EAppTypes.app].includes(
        EAppEvents[data['data']['event']],
      );
      const eventIsConfiguredForWeb = EventsVsApps[EAppTypes.web].includes(
        EAppEvents[data['data']['event']],
      );
      const eventIsConfiguredForPanel = EventsVsApps[EAppTypes.panel].includes(
        EAppEvents[data['data']['event']],
      );
      let msgError = 'its not conected to this host';
      if (
        !eventIsConfiguredForApp &&
        !eventIsConfiguredForWeb &&
        !eventIsConfiguredForPanel
      ) {
        msgError = 'event not well configured, check';
      }
      const appType = app ? app : '?';
      this.logger.debug(
        `${this.contextTitle}User with id {toUserId}; ${msgError}`,
        {
          context,
          toUserId: userId,
          appType,
          apsToNotify: notifAppTypes,
          appToNotify: app ? app : 'NULL',
          eventIsConfiguredForApp,
          eventIsConfiguredForWeb,
          eventIsConfiguredForPanel,
          data,
        },
      );
    }
  }

  sendToAll(
    data: any,
    destiny: EAppTypes[] | null = null,
    sendedByInternal = false,
  ): void {
    if (destiny === null || destiny.includes(EAppTypes.web)) {
      this.server.emit('public_web', data);
    }
    if (destiny === null || destiny.includes(EAppTypes.app)) {
      this.server.emit('public_app', data);
    }
    /*
    setTimeout(
      () => {
        // proccess
      },
      generateIntegerRandom(100, 200),
    );
    */

    if (sendedByInternal === false) {
      const dataToShare: IInternalData<any> = {
        sendedBy: 'sendToAll',
        hostname: this.hostname,
        data: { ...data },
        destiny,
      };
      this.sendToInternaChanel(dataToShare);
    }
  }

  sendToUsers(usersToNotify: number[], data: any) {
    const context = `${this.context}sendToUsers`;
    this.logger.debug(
      `${this.contextTitle}Users are notified [${data.event}]`,
      {
        context,
        usersCount: usersToNotify.length,
        data,
      },
    );
    usersToNotify.forEach((userId) => {
      this.sendToUser(userId, data);
    });
  }

  private sendToInternaChanel(dataToShare) {
    const dataToShareStr = JSON.stringify(dataToShare);
    this.logger.debug(
      `${this.contextTitle}resend internal message to other pods`,
      {
        context: `${this.context}sendToUserByApp`,
        dataToShare,
      },
    );
    const publisherIOClient = this.redisAdapter.getRedisClient().duplicate();
    publisherIOClient.publish(this.internalChanel, dataToShareStr, () => {
      publisherIOClient.quit();
    });
  }
}
