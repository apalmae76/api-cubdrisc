/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';
import { addYears } from 'date-fns';
import { existsSync, readFileSync } from 'fs';
import * as handlebars from 'handlebars';
import * as pdf from 'html-pdf';
import path, { join } from 'path';
import { PatientPanelModel } from 'src/domain/model/patient';
import { PersonSurveyFullModel } from 'src/domain/model/personSurvey';
import { AnswerModel } from 'src/domain/model/personSurveyAnswers';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';

export interface PdfOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  border?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  header?: {
    height?: string;
    contents?: string;
  };
  footer?: {
    height?: string;
    contents?: {
      default?: string;
      first?: string;
      [page: number]: string;
    };
  };
  timeout?: number;
  renderDelay?: number;
}

@Injectable()
export class PdfGeneratorService {
  private context = `${PdfGeneratorService.name}.`;
  private readonly TEMPLATES_DIR: string;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> =
    new Map();

  constructor(@Inject(API_LOGGER_KEY) private readonly logger: IApiLogger) {
    // Usamos path.resolve para asegurar que la ruta es absoluta
    this.TEMPLATES_DIR = path.resolve(__dirname, 'templates');
    // this.TEMPLATES_DIR = join(process.cwd(), 'templates');
    this.logger.debug(
      `Templates directory resolved to: ${this.TEMPLATES_DIR}`,
      {
        context: `${this.context}constructor`,
      },
    );
  }

  /**
   * Carga y compila un template desde archivo
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const context = `${this.context}loadTemplate`;
    // Verificar si ya está compilado en caché
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName)!;
    }

    const templatePath = join(this.TEMPLATES_DIR, `${templateName}.html`);

    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}; check`);
    }

    try {
      // Leer template del archivo
      const templateContent = readFileSync(templatePath, 'utf8');

      // Compilar con Handlebars
      const template = handlebars.compile(templateContent, {
        noEscape: true, // Para mantener HTML
        strict: true,
      });

      // Guardar en caché
      this.compiledTemplates.set(templateName, template);

      this.logger.debug(`Template "${templateName}" successfully loaded`, {
        context,
      });
      return template;
    } catch (error) {
      this.logger.error(`Error loading template ${templateName}:`, {
        context,
        error,
      });
      throw new Error(`Cant load template: ${templateName}`);
    }
  }

  /**
   * Genera HTML a partir de template y datos
   */
  private renderTemplate(templateName: string, data: any): string {
    const context = `${this.context}renderTemplate`;
    try {
      const template = this.loadTemplate(templateName);
      return template(data);
    } catch (error) {
      this.logger.error(`Error renderizando template ${templateName}:`, {
        context,
        error,
      });
      throw error;
    }
  }

  /**
   * Genera PDF a partir de template HTML
   */
  async generatePdfFromTemplate(
    templateName: string,
    data: any,
    options?: PdfOptions,
  ): Promise<Buffer> {
    const context = `${this.context}generatePdfFromTemplate`;
    try {
      // Renderizar HTML
      const html = this.renderTemplate(templateName, data);

      // Configuración por defecto para PDF
      const defaultOptions: pdf.CreateOptions = {
        format: 'A4',
        orientation: 'portrait',
        border: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        type: 'pdf',
        quality: '100',
        renderDelay: 3000, // Más tiempo para CSS complejo
        timeout: 30000,
        phantomArgs: [
          '--ignore-ssl-errors=yes',
          '--web-security=no',
          '--load-images=yes',
          '--local-to-remote-url-access=yes',
        ],
      };

      // Fusionar opciones personalizadas
      const border =
        typeof defaultOptions.border === 'object'
          ? { ...defaultOptions.border, ...options?.border }
          : { ...options?.border };
      const pdfOptions: pdf.CreateOptions = {
        ...defaultOptions,
        ...options,
        border,
      };

      // Generar PDF
      return new Promise((resolve, reject) => {
        pdf.create(html, pdfOptions).toBuffer((error, buffer) => {
          if (error) {
            this.logger.error(`Error generando PDF: ${error.message}`, {
              context,
            });
            reject(error);
          } else {
            this.logger.debug(
              `PDF generado exitosamente (${buffer.length} bytes)`,
              { context },
            );
            resolve(buffer);
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error en generatePdfFromTemplate: ${error.message}`, {
        context,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * Genera PDF del test médico
   */
  async generarPdfTestMedico(
    personSurvey: PersonSurveyFullModel,
    answeredQuestions: AnswerModel[],
    patient: PatientPanelModel | null = null,
  ): Promise<string> {
    const context = `${this.context}generarPdfTestMedico`;
    try {
      // Preparar datos para el template
      const pdfData = {
        test: {
          name: personSurvey.surveyName,
          description: personSurvey.surveyDescription,
        },
        personSurvey: this.formatPersonSurveyData(personSurvey),
        answeredQuestions: this.formatAnsweredQuestions(answeredQuestions),
        medic: this.formatMedicData(patient),
        dates: this.formatDates(personSurvey),
      };

      this.logger.debug(`Generating PDF for test: ${personSurvey.surveyName}`, {
        context,
      });

      // Generar PDF usando el template "test-medico"
      const pdfBuffer = await this.generatePdfFromTemplate(
        'test-medico',
        pdfData,
        {
          format: 'A4',
          border: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
          footer: {
            height: '15mm',
            contents: {
              default: `
              <div style="text-align: center; font-size: 8pt; color: #666; padding-top: 10px; border-top: 1px solid #ddd;">
                Página {{page}} de {{pages}} | Documento confidencial
              </div>
            `,
            },
          },
        },
      );

      // Convertir a base64
      return pdfBuffer.toString('base64');
    } catch (error) {
      this.logger.error(`Error generando PDF médico: ${error.message}`, {
        context,
        error: error.stack,
      });
      throw new Error(`No se pudo generar el PDF: ${error.message}`);
    }
  }

  /**
   * Métodos auxiliares para formatear datos
   */
  private formatPersonSurveyData(personSurvey: PersonSurveyFullModel): any {
    return {
      ...personSurvey,
      fullName: personSurvey.fullName || 'No especificado',
      ci: personSurvey.ci || 'No especificado',
      age: personSurvey.age || 'No especificado',
      dateOfBirth: personSurvey.dateOfBirth
        ? new Date(personSurvey.dateOfBirth).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        : 'No especificado',
      totalScore: personSurvey.totalScore || 0,
      estimatedRisk: personSurvey.estimatedRisk || 'No determinado',
      estimatedRiskPercent: personSurvey.estimatedRiskPercent || 0,
      estimatedRiskDescription: personSurvey.estimatedRiskDescription || '',
    };
  }

  private formatAnsweredQuestions(answeredQuestions: AnswerModel[]): any[] {
    return answeredQuestions.map((aq, index) => ({
      ...aq,
      questionOrder: index + 1,
      answer: aq.answer || 'Sin respuesta',
      educationalTip: aq.educationalTip || '',
    }));
  }

  private formatMedicData(patient: PatientPanelModel | null): any {
    return {
      fullName: patient?.medicFullName || null,
      medicalSpecialty: patient?.medicalSpecialtyName || null,
    };
  }

  private formatDates(personSurvey: PersonSurveyFullModel): any {
    const completionDate = personSurvey.updatedAt
      ? new Date(personSurvey.updatedAt)
      : new Date();

    return {
      completionDate: completionDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      generationDate: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      canRepeatDate: personSurvey.updatedAt
        ? new Date(addYears(personSurvey.updatedAt, 1)).toLocaleDateString(
          'es-ES',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        )
        : '',
    };
  }

  /**
   * Método para generar y guardar PDF en disco
   */
  async generateAndSavePdf(
    templateName: string,
    data: any,
    outputPath: string,
    options?: PdfOptions,
  ): Promise<string> {
    const context = `${this.context}generateAndSavePdf`;
    const pdfBuffer = await this.generatePdfFromTemplate(
      templateName,
      data,
      options,
    );

    // Usar import dinámico para fs/promises
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, pdfBuffer);

    this.logger.debug(`PDF saved in: ${outputPath}`, { context });
    return outputPath;
  }

  /**
   * Método para limpiar caché de templates (útil en desarrollo)
   */
  clearTemplateCache(templateName?: string): void {
    const context = `${this.context}generateAndSavePdf`;
    if (templateName) {
      this.compiledTemplates.delete(templateName);
      this.logger.debug(`Template "${templateName}" removed from cache`, {
        context,
      });
    } else {
      this.compiledTemplates.clear();
      this.logger.debug('All templates removed from cache', { context });
    }
  }
}
