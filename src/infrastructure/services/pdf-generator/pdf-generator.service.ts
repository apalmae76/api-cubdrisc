/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

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
  private browser: puppeteer.Browser;
  private readonly templatesDir: string;
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor() {
    this.templatesDir = path.join(__dirname, '/templates');
  }

  /**
   * Initializes the Puppeteer browser instance
   * This runs once when the application starts
   */
  async onModuleInit() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('Puppeteer browser launched successfully.');
    } catch (error) {
      this.logger.error('Failed to launch Puppeteer browser.', error.stack);
      throw new Error('PDF Generation Service initialization failed.');
    }
  }

  /**
   * Closes the browser instance when the module is destroyed
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed.');
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
    let page: puppeteer.Page | null = null;

    // Check if the browser is initialized
    if (!this.browser) {
      this.logger.error(
        'Browser instance is not available. onModuleInit might have failed.',
      );
      throw new Error('PDF generation service is not ready.');
    }

    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

      this.logger.debug(`Attempting to read template from: ${templatePath}`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');

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
        error.stack,
      );
      throw new Error(
        `Error generando PDF: ${error.message}. Check logs for details.`,
      );
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generates PDF and saves it to the file system (useful for development/debugging)
   * @param templateName The name of the Handlebars template file
   * @param data Dynamic data for the template
   * @param outputPath Full path to save the PDF file
   * @param options PDF configuration options
   */
  async generatePdfAndSave(
    templateName: string,
    data: PdfData,
    outputPath: string,
    options: PdfOptions = {},
  ): Promise<void> {
    const pdfBuffer = await this.generatePdf(templateName, data, options);
    await fs.writeFile(outputPath, pdfBuffer);
  }
}
