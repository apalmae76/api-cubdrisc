import { Inject, Injectable } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { UseCls } from 'nestjs-cls';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { ApiRedisService } from '../redis/redis.service';

import * as os from 'os';
import ContextStorageService, {
  ContextStorageServiceKey,
} from '../context/context.interface';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';

@Injectable()
export class CronTasksService {
  private readonly contextTitle = '[CRON-CONF]';
  private readonly context = `${CronTasksService.name}.`;
  private readonly hostname = os.hostname();
  constructor(
    private readonly redisService: ApiRedisService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly appConfigServ: EnvironmentConfigService,
    @Inject(API_LOGGER_KEY) private readonly logger: IApiLogger,
    @Inject(ContextStorageServiceKey)
    protected contextStorageService: ContextStorageService,
  ) { }

  @UseCls({
    setup: (cls) => {
      cls.set('mode', 'cron');
      cls.set('app', 'panel'); // In cron context, include app in all flows
    },
  })
  async onModuleInit() {
    if (this.appConfigServ.isJobLider()) {
      this.logger.verbose(`${this.contextTitle}: No configured jobs found`, {
        hostname: this.hostname,
        context: `${this.context}onModuleInit`,
      });
    } else {
      this.logger.verbose(
        `${this.contextTitle}: POD ${this.hostname}, not configured to run scheduled tasks`,
        {
          hostname: this.hostname,
          context: `${this.context}onModuleInit`,
        },
      );
    }
  }

  /**
   * Adds a scheduled job (cron job) to the scheduler registry.
   *
   * @param {string} name - A unique name for the job, used to identify it in the registry.
   * @param {string} cronExpression - The cron expression defining the schedule for the job.
   *                                  This can be a standard cron expression or a key defined
   *                                  in `CronExpression`.
   * @param {() => Promise<void>} callback - The asynchronous function to execute when the job is triggered.
   * @param {boolean} [startNow=false] - Indicates if the job should execute immediately after being added.
   *                                     Defaults to `false`.
   *
   * @returns {Promise<void>} - If the job is configured as 'NONE', the function logs a message
   *                            and exits without creating the job.
   *
   * ## Cron Expression Example
   *
   * The cron expression follows the standard format:
   *
   * ```
   * ┌───────────── minute (0 - 59)
   * │ ┌───────────── hour (0 - 23)
   * │ │ ┌───────────── day of the month (1 - 31)
   * │ │ │ ┌───────────── month (1 - 12)
   * │ │ │ │ ┌───────────── day of the week (0 - 7, Sunday=0 or 7)
   * │ │ │ │ │
   * │ │ │ │ │
   * * * * * *
   * ```
   *
   * For example, the expression `'0 2 * * *'` means the job will run:
   * - **Minute**: 0 (at the start of the hour)
   * - **Hour**: 2 (2:00 AM)
   * - **Day of the month**: Every day
   * - **Month**: Every month
   * - **Day of the week**: Every day
   *
   * This results in the job being triggered daily at **2:00 AM**.
   * ### Example Usage
   * ```typescript
   * // Define a callback function for the job.
   * const jobCallback = async () => {
   *   console.log('Cron job executed at:', new Date().toISOString());
   *   // Add your custom logic here.
   * };
   *
   * // Add a job to run every day at 2:00 AM.
   * await addCronJob(
   *   'example:daily:runAt2AM',
   *   '0 2 * * *', // Cron expression for 2:00 AM daily
   *   jobCallback,
   *   false, // Do not start immediately.
   * );
   * ```
   */
  async addCronJob({
    name,
    cronExpression,
    callback,
    startNow = false,
  }: {
    name: string;
    cronExpression: string;
    callback: () => Promise<void>;
    startNow?: boolean;
  }): Promise<void> {
    const context = `${this.context}addCronJob`;
    const marker = name.split(':')[2];
    if (cronExpression === 'NONE') {
      const message = `Job ${marker}, has been configured NOT TO BE USED`;
      this.logger.info(`${this.contextTitle}: ${message}`, {
        context,
        marker,
        message,
      });
      return;
    }

    const cronExp = cronExpression.startsWith('0')
      ? cronExpression
      : CronExpression[cronExpression];
    //* console.log(`cronExp = '${cronExp}'`);
    const job = new CronJob(
      `${cronExp}`,
      () => {
        callback();
      },
      null,
      true,
    );
    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.info(
      `${this.contextTitle}: Job {marker}, has been added with the following cron expression: {cronExpression}`,
      {
        marker,
        context,
        cronExpression,
        startNow,
      },
    );

    if (startNow || this.appConfigServ.isDevelopmentEnv()) {
      callback();
    }
  }
}
