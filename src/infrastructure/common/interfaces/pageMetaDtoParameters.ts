import { PageOptionsDto } from '../dtos/pageOptions.dto';

export interface PageMetaDtoParameters {
  pageOptionsDto: PageOptionsDto;
  total: number;
  itemPageCount?: number;
}
