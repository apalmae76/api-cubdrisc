import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { I18nMiddleware } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { CustomI18nValidationExceptionFilter } from './infrastructure/common/filter/customI18nValidationExceptionFilter';
import { LoggerInterceptor } from './infrastructure/common/interceptors/logger.interceptor';
import { ResponseFormat } from './infrastructure/common/interceptors/response.interceptor';
import {
  EAppLanguages,
  EAppTypes,
  eAppTypesValues,
  eEAppLanguages,
} from './infrastructure/common/utils/constants';
import { EnvironmentConfigService } from './infrastructure/config/environment-config/environment-config.service';
import { AdminControllersModule } from './infrastructure/controllers/admin.controllers.module';
import { ControllersModule } from './infrastructure/controllers/controllers.module';
import { ContextStorageServiceKey } from './infrastructure/services/context/context.interface';
import { IApiLogger } from './infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from './infrastructure/services/logger/logger.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const envCfgServ = app.get(EnvironmentConfigService);
  const nodeEnv = envCfgServ.getNodeEnv();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginResourcePolicy: false,
    }),
  );
  const origin = envCfgServ.getListOfAuthorizedAddresses();
  const corsOptions: CorsOptions = {
    origin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-API-Version',
      'X-Client-ID',
      'Cache-Control',
      'If-Modified-Since',
      'version',
      'app',
    ],
    maxAge: 86400,
  };
  app.enableCors(corsOptions);

  app.use(I18nMiddleware);
  const logger = app.get<IApiLogger>(API_LOGGER_KEY);
  app.useGlobalFilters(new CustomI18nValidationExceptionFilter(logger));

  const cls = app.get(ContextStorageServiceKey);
  app.useGlobalInterceptors(new LoggerInterceptor(logger, cls));

  // base routing
  app.setGlobalPrefix('api');

  // configure some security options
  app.use((req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // we can add anothers here
    next();
  });

  const appVersion = envCfgServ.getAppVersion();
  const appName = envCfgServ.getAppName();

  if (envCfgServ.isNotProductionEnv()) {
    const apiBaseUrl = envCfgServ.getBaseApiFullByEnvUrl();
    const apiCfg = new DocumentBuilder()
      .setTitle(appName)
      .setVersion(appVersion)
      .setDescription(
        `[ Base URL: ${apiBaseUrl} ] <a href="${apiBaseUrl}/api/users/swagger-json" target="_blank">Download json</a>`,
      )
      .addGlobalParameters({
        name: 'app',
        required: true,
        in: 'header',
        schema: {
          enum: eAppTypesValues,
          example: EAppTypes.web,
        },
      })
      .addGlobalParameters({
        name: 'Accept-Language',
        required: false,
        in: 'header',
        schema: {
          enum: eEAppLanguages,
          example: EAppLanguages.es,
        },
      })
      .addBearerAuth(
        {
          type: 'apiKey',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
          description: 'Type into the textbox: Bearer {your JWT token}',
        },
        'JWT',
      )
      .build();
    const apiDoc = SwaggerModule.createDocument(app, apiCfg, {
      extraModels: [ResponseFormat],
      deepScanRoutes: true,
      include: [ControllersModule],
    });
    // Expose swagger JSON in this route
    app.use('/api/users/swagger-json', (req, res) => {
      res.send(apiDoc);
    });
    SwaggerModule.setup('api/users', app, apiDoc, {
      swaggerOptions: {
        docExpansion: 'none',
      },
    });
    // -------- admin ---------------------------------------------------
    const adminCfg = new DocumentBuilder()
      .setTitle(`admin ${appName}`)
      .setVersion(appVersion)
      .setDescription(
        `[ Base URL: ${apiBaseUrl} ] <a href="${apiBaseUrl}/api/admins/swagger-json" target="_blank">Download json</a>`,
      )
      .addGlobalParameters({
        name: 'app',
        required: false,
        in: 'header',
        schema: {
          enum: eAppTypesValues,
          example: EAppTypes.panel,
        },
      })
      .addGlobalParameters({
        name: 'Accept-Language',
        required: true,
        in: 'header',
        schema: {
          enum: eEAppLanguages,
          example: EAppLanguages.es,
        },
      })
      .addBearerAuth(
        {
          type: 'apiKey',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
          description: 'Type into the textbox: Bearer {your JWT token}',
        },
        'JWT',
      )
      .build();
    const adminDoc = SwaggerModule.createDocument(app, adminCfg, {
      extraModels: [ResponseFormat],
      deepScanRoutes: true,
      include: [AdminControllersModule],
    });
    // Expose swagger JSON in this route
    app.use('/api/admins/swagger-json', (req, res) => {
      res.send(adminDoc);
    });
    SwaggerModule.setup('api/admin', app, adminDoc, {
      swaggerOptions: {
        docExpansion: 'none',
      },
    });
  }

  const port = envCfgServ.getPort();
  if (envCfgServ.getSeqServerUrl() !== 'NONE') {
    logger.info(
      `[APP-START] {appName} started in "${nodeEnv}" env, on port "${port}", version ${appVersion}`,
      {
        nodeEnv,
        port,
        appVersion,
      },
    );
  }
  console.log(
    `[APP-START] ${appName} started in "${nodeEnv}" env, on port "${port}", version ${appVersion}`,
  );
  const apiUrl = envCfgServ.getBaseUrlWeb();
  const apiFullUrl = apiUrl.includes('localhost')
    ? `http://${apiUrl}/api`
    : `https://${apiUrl}/api`;
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `🚀 API running on port ${port} - accessible from network on: ${apiFullUrl}`,
    );
  });
}

bootstrap();
