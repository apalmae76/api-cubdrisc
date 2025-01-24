import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operatorsActions.repository';
import { v4 as uuidv4 } from 'uuid';
import { ApiLoggerService } from '../logger/logger.service';
import { ApiRedisService } from '../redis/redis.service';

@Injectable()
export class RefreshBaseService {
  protected readonly refreshServicesID: string;
  protected contextTitle: string = '[CRON]->> Task service, Refresh ';
  protected readonly context: string = 'CronTasksService.RefreshBaseService.';
  protected readonly isRunningCacheKey: string = 'CRONJOB:';
  protected readonly isRunningMsg: string = 'messages.admin.';
  constructor(
    protected readonly operActionRepo: DatabaseOperatorsActionsRepository,
    protected readonly i18nService: I18nService,
    protected readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
    contextTitle: string,
    context: string,
    isRunningMsg: string,
  ) {
    this.refreshServicesID = uuidv4();
    this.contextTitle = `${this.contextTitle}${contextTitle} (${this.refreshServicesID})`;
    this.context = `${this.context}${context}Service.`;
    this.isRunningCacheKey = `${this.isRunningCacheKey}${context}`;
    this.isRunningMsg = `${this.isRunningMsg}${isRunningMsg}`;
  }

  protected async adminRefreshBase(
    userId: number,
    actionId: EOperatorsActions,
    reason: string,
    now: number,
    context,
  ): Promise<number> {
    const servIsRunning = await this.redisService.get<number>(
      this.isRunningCacheKey,
    );
    if (servIsRunning) {
      this.logger.warn(
        `${this.contextTitle}: not started, service is still running, CHECK, duration={duration}ms`,
        {
          context,
          userId,
          duration: Date.now() - servIsRunning,
        },
      );

      throw new BadRequestException({
        message: [this.isRunningMsg],
      });
    }
    await this.redisService.set<number>(
      this.isRunningCacheKey,
      now,
      12 * 60 * 60, // 12hours
    );

    const payload = <OperatorsActionCreateModel>{
      operatorId: userId,
      toUserId: null,
      reason,
      actionId,
    };
    const opAction = await this.operActionRepo.create(payload, null);
    return opAction.id;
  }
}
