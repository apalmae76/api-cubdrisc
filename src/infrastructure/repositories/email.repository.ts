import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEmailModel, UserEmailPanelModel } from 'src/domain/model/email';
import { IUserEmailRepository } from 'src/domain/repositories/emailRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { UserEmails } from '../entities/emails.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabaseEmailRepository
  extends BaseRepository
  implements IUserEmailRepository
{
  constructor(
    @InjectRepository(UserEmails)
    private readonly userEmailEntity: Repository<UserEmails>,
    protected readonly logger: ApiLoggerService,
  ) {
    super(userEmailEntity, logger);
  }

  async create(
    userId: number,
    email: string,
    em: EntityManager,
  ): Promise<UserEmailModel> {
    const repo = em ? em.getRepository(UserEmails) : this.userEmailEntity;
    const isRregisteredByUser = await this.isRregisteredByUser(
      userId,
      email,
      em,
    );
    if (!isRregisteredByUser) {
      const userEmailEntity = this.toEntityCreate(userId, email);
      const createdUserEMail = await repo.save(userEmailEntity);
      return this.toModel(createdUserEMail);
    }
    return null;
  }

  async getByUserId(userId: number): Promise<UserEmailModel[]> {
    const userEmails = await this.userEmailEntity
      .createQueryBuilder()
      .select([
        'id',
        'email_address as "emailAddress"',
        'created_at as "createdAt"',
      ])
      .where('user_id = :userId', { userId })
      .getRawOne();
    if (!userEmails) {
      return null;
    }
    return userEmails;
  }

  async isRregisteredByUser(
    userId: number,
    email: string,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(UserEmails) : this.userEmailEntity;
    const userEMail = await repo
      .createQueryBuilder()
      .select(['id'])
      .where('user_id = :userId and email_address = :email', { userId, email })
      .getRawOne();
    return !!userEMail;
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<UserEmailPanelModel>> {
    const queryCount = null;
    const queryList = this.userEmailEntity
      .createQueryBuilder('emails')
      .select([
        'emails.id as "id"',
        'emails.user_id as "userId"',
        'emails.email_address as "emailAddress"',
        'emails.created_at as "createdAt"',
      ]);

    const data = await super.getByQueryBase<UserEmails>(
      queryDto,
      'emails',
      queryCount,
      queryList,
      true,
    );

    const emails = data.entities.map((email) => this.toModelPanel(email));

    const pageMetaDto = new PageMetaDto({
      total: data.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: emails.length,
    });

    return new PageDto(emails, pageMetaDto);
  }

  private toModelPanel(entity: UserEmails): UserEmailPanelModel {
    const model = new UserEmailPanelModel();

    model.id = Number(entity.id);
    model.user = {
      id: Number(entity.userId),
      name: entity['user.name'],
    };

    model.emailAddress = entity.emailAddress;

    model.createdAt = entity.createdAt;

    return model;
  }

  private toModel(entity: UserEmails): UserEmailModel {
    const model = new UserEmailModel();

    model.id = Number(entity.id);
    model.userId = Number(entity.userId);
    model.emailAddress = entity.emailAddress;
    model.createdAt = entity.createdAt;

    return model;
  }

  private toEntityCreate(userId: number, email: string): UserEmails {
    const entity = new UserEmails();

    entity.userId = userId;
    entity.emailAddress = email;

    return entity;
  }
}
