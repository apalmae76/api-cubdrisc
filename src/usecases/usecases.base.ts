import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SYSTEM_USER_ID } from 'src/infrastructure/common/utils/constants';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { AuthUser } from 'src/infrastructure/controllers/auth/auth-user.interface';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';

@Injectable()
export class UseCaseBase {
  protected contextTitle;
  protected context;
  constructor(protected readonly logger: ApiLoggerService) { }

  /**
   * Abstraction of error handling and throwing of appropriate exceptions
   * @param er Catch error object
   * @param contextTitle Context message for logs, general
   * @param context Context message for logs, detail
   * @param failOnAllErrors Indicates whether or not it throws an exception on ALL errors. False by default
   * @param debug Activates some console.log to see results, only for dev env. False by default
   * @returns void
   */
  protected async personalizeError(
    er: unknown,
    context: string,
    failOnAllErrors = true,
    debug = false,
  ) {
    const { message, status } = extractErrorDetails(er, '', debug);
    if (message) {
      if (
        message === `Person's Name can't be modified. Create a New Person.` ||
        message === 'SOMETHING_WRONG_RETRY' ||
        message.includes('Cannot read properties of null')
      ) {
        this.logger.warn('Fails; {message}', {
          context: `${context}.catch`,
          marker: 'CHECK',
          message,
        });
        if (failOnAllErrors) {
          throw new UnprocessableEntityException({
            message: ['messages.common.SOMETHING_WRONG_RETRY'],
          });
        } else {
          return false;
        }
      } else if (
        message.includes(
          `Cannot read properties of undefined (reading 'getByQuery')`,
        )
      ) {
        const error =
          'Repository for send entity has not been included, please check';
        this.logger.warn(`Fails; ${error}`, {
          context: `${context}.catch`,
          marker: 'CHECK',
          message,
        });
        if (failOnAllErrors) {
          throw new UnprocessableEntityException({
            message: [
              `messages.common.SOMETHING_WRONG_RETRY|${JSON.stringify({ technicalError: error })}`,
            ],
          });
        } else {
          return false;
        }
      } else if (message.includes('QueryFailedError')) {
        this.logger.warn('Fails; {message}', {
          context: `${context}.catch`,
          marker: 'CHECK',
          message,
        });
        if (failOnAllErrors) {
          throw new UnprocessableEntityException({
            message: [
              `messages.common.SOMETHING_WRONG_RETRY|${JSON.stringify({ technicalError: message })}`,
            ],
          });
        } else {
          return false;
        }
      } else {
        const systemUserDoesNotExist = message.includes(
          `(created_by)=(${SYSTEM_USER_ID})`,
        );
        if (systemUserDoesNotExist) {
          this.logger.error(
            `Failed with errors, system user (id:${SYSTEM_USER_ID}) does not exist`,
            {
              context: `${context}.catch`,
              message,
            },
          );
          if (failOnAllErrors) {
            throw new UnprocessableEntityException({
              message: ['messages.common.SOMETHING_WRONG'],
            });
          }
          return false;
        }
      }
      this.logger.verbose('Fail; {message}', {
        context: `${context}.catch`,
        message,
      });
      if (failOnAllErrors) {
        if (status === 400) {
          throw new BadRequestException({
            message,
          });
        } else if (status === 401) {
          throw new UnauthorizedException({ message });
        } else if (status === 403) {
          throw new ForbiddenException({ message });
        } else if (status === 404) {
          throw new NotFoundException({ message });
        } else if (status === 422) {
          //* console.log('------------ se fue por aqui------------');
          throw new UnprocessableEntityException({ message });
        } else if (status === 500) {
          throw new InternalServerErrorException({ message });
        } else if (status >= 501) {
          if (typeof er === 'object' && 'status' in er) {
            er.status = 422;
          }
          throw new UnprocessableEntityException({ message });
        }
      } else {
        return false;
      }
    }

    this.logger.error('Not personalized; {message}', {
      context: `${context}.catch`,
      marker: 'CHECK',
      message,
    });
    if (failOnAllErrors) {
      throw new UnprocessableEntityException({
        message: ['messages.common.SOMETHING_WRONG_RETRY'],
      });
    } else {
      return false;
    }
  }

  protected handleNoChangedValuesOnUpdate<T>(
    context: string,
    response: T,
    isProductionEnv: boolean,
    personalizedError?: BadRequestException,
  ): T {
    if (!isProductionEnv) {
      const defaultError = new BadRequestException({
        message: ['messages.common.VALUES_NOT_CHANGED'],
      });
      const error = personalizedError ?? defaultError;
      throw error;
    }
    this.logWarnForNoChangesMadeOnUpdate(context);
    return response;
  }

  protected logWarnForNoChangesMadeOnUpdate(context: string): void {
    const msg = 'There is no any changes; CHECK';
    this.logger.warn(`Ends with warn; ${msg} !`, {
      result: false,
      message: `${context}: ${msg}`,
      context,
    });
  }

  protected async isSameUser(
    user: AuthUser,
    toUserId: number,
    contextTitle: string,
    context: string,
    allowAdmin: boolean = true,
  ) {
    if (user.id === toUserId) {
      const isUserAdmin =
        user && user.roles.length > 0 && user.roles.includes(EAppRoles.ADMIN);
      if (allowAdmin && isUserAdmin) {
        return true;
      }
      this.logger.debug(`${contextTitle}, ends with errors, same user`, {
        operatorId: user.id,
        roles: user.roles,
        toUserId,
        context,
      });
      throw new BadRequestException({
        message: [
          `validation.payment.SAME_USER|{"operatorId":"${user.id}","toUserId":"${toUserId}"}`,
        ],
      });
    }
  }
}
