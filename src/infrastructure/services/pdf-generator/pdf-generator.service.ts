/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { addYears } from 'date-fns';
import * as fs from 'fs'; // Importación síncrona/general de 'fs'
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { PersonSurveyFullModel } from 'src/domain/model/personSurvey';
import { AnswerModel } from 'src/domain/model/personSurveyAnswers';
import { ApiLoggerService } from '../logger/logger.service';

// Usa fs.promises para operaciones asíncronas
const fsPromises = fs.promises;

// Interface for dynamic data payload
export interface PdfData {
  [key: string]: any;
}

// Interface for optional PDF settings
export interface PdfOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
  private context = `${PdfGeneratorService.name}.`;
  private browser: puppeteer.Browser;
  private readonly templatesDir: string;

  constructor(private readonly logger: ApiLoggerService) {
    // Usamos path.resolve para asegurar que la ruta es absoluta
    this.templatesDir = path.resolve(__dirname, 'templates');
    this.logger.debug(`Templates directory resolved to: ${this.templatesDir}`, {
      context: `${this.context}constructor`,
    });
  }

  /**
   * Initializes the Puppeteer browser instance
   */
  async onModuleInit() {
    const context = `${this.context}onModuleInit`;
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.debug('Puppeteer browser launched successfully', { context });
    } catch (error) {
      this.logger.error('Failed to launch Puppeteer browser.', {
        context,
        error: error.stack,
      });
      throw new Error('PDF Generation Service initialization failed');
    }
  }

  /**
   * Closes the browser instance when the module is destroyed
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.debug('Puppeteer browser closed', {
        context: `${this.context}onModuleDestroy`,
      });
    }
  }

  /**
   * Generates a PDF buffer from an HTML template and dynamic data
   * @param templateName The name of the Handlebars template file (e.g., 'report')
   * @param data Dynamic data to compile the template
   * @param options PDF configuration options
   * @returns A Promise that resolves to the PDF file Buffer
   */
  async generatePdf(
    templateName: string,
    data: PdfData,
    options: PdfOptions = {},
  ): Promise<Buffer> {
    const context = `${PdfGeneratorService.name}.generatePdf`;
    let page: puppeteer.Page | null = null;

    if (!this.browser) {
      this.logger.error(
        'Browser instance is not available. onModuleInit might have failed.',
        {
          context,
        },
      );
      throw new Error('PDF generation service is not ready.');
    }

    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

      this.logger.debug(`Attempting to read template from: ${templatePath}`, {
        context,
      });

      if (!fs.existsSync(templatePath)) {
        const errorMsg = `FATAL ERROR: Template file NOT FOUND at: ${templatePath}.`;
        this.logger.error(errorMsg, {
          context,
        });
        return null;
      }
      // **********************************************

      // Usamos el import basado en promesas para la lectura
      const templateContent = await fsPromises.readFile(templatePath, 'utf-8');

      const compiledTemplate = handlebars.compile(templateContent);
      const html = compiledTemplate(data);

      page = await this.browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfOptions: puppeteer.PDFOptions = {
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: true,
      };

      const pdfBuffer = (await page.pdf(pdfOptions)) as Buffer;

      return pdfBuffer;
    } catch (error) {
      this.logger.error(
        `Error during PDF generation for template ${templateName}:`,
        {
          context,
          error: error.stack,
        },
      );
      throw new Error(
        `Error generating PDF: ${error.message}. Check logs for details.`,
      );
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async generarPdfTestMedico(
    personSurvey: PersonSurveyFullModel,
    answeredQuestions: AnswerModel[],
  ): Promise<string> {
    const pdfData = {
      test: {
        nombre: personSurvey.surveyName,
        description: personSurvey.surveyDescription,
      },
      personSurvey,
      answeredQuestions,
      completionDate: new Date(personSurvey.updatedAt).toLocaleDateString(
        'es-ES',
      ),
      generationDate: new Date().toLocaleDateString('es-ES'),
      canRepeatDate: new Date(
        addYears(personSurvey.updatedAt, 1),
      ).toLocaleDateString('es-ES'),
    };

    // Generar PDF
    const pdfBuffer = await this.generatePdf('test-medico', pdfData, {
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    return pdfBuffer.toString('base64');
  }
}
