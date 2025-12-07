import { Module } from '@nestjs/common';
import { ApiLoggerModule } from '../logger/logger.module';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [ApiLoggerModule],
  providers: [PdfGeneratorService],
  exports: [PdfGeneratorService],
})
export class PdfGeneratorModule { }
