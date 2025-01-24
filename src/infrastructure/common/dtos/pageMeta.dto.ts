import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDtoParameters } from '../interfaces/pageMetaDtoParameters';

export class PageMetaDto {
  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly take: number;

  @ApiProperty()
  readonly total: number;

  @ApiProperty()
  readonly pageCount: number;

  @ApiProperty()
  readonly itemPageCount: number;

  @ApiProperty()
  readonly hasPreviousPage: boolean;

  @ApiProperty()
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, total, itemPageCount }: PageMetaDtoParameters) {
    this.total = total;
    this.page = pageOptionsDto.page;
    this.take = pageOptionsDto.take;
    this.pageCount = Math.ceil(this.total / this.take);
    this.itemPageCount = itemPageCount !== undefined ? itemPageCount : 0;
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}
