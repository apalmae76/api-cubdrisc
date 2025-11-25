import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { generateIntegerRandom } from '../src/infrastructure/common/utils/random';
import { AppModule } from './../src/app.module';
import { AuthTestHelper } from './auth-helper';

describe('SurveyController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  // Test data
  const nroTest = generateIntegerRandom(1, 10000);

  // Setup: Initialize the NestJS application before all tests
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authToken = await AuthTestHelper.getValidToken(app);
  });

  // Teardown: Close the NestJS application after all tests
  afterAll(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllTimers();
    if (global.gc) {
      global.gc();
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  // Test case: Successful creation of a new Survey (POST /survey) -------------------------
  it('/survey (POST) - Should successfully create a new Survey', async () => {
    const newSurveyPayload = {
      name: `Test de prueba nro ${nroTest}`,
      description: `Creando test con jest, para probar el crud (random nro ${nroTest})`,
      calcRisks: true,
    };
    return await request(app.getHttpServer())
      .post('/survey')
      .set('app', 'panel')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'jest-test')
      .set('Accept-Language', 'es')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newSurveyPayload)
      .expect(201) // expect status code 201 (Created)
      .expect((res) => {
        // validate the response body
        const responseBody = res.body;

        // verify the basic response structure
        expect(responseBody).toHaveProperty('data');
        expect(responseBody).toHaveProperty('message');
        expect(responseBody.errors).toEqual([]);
        // verify the success message
        expect(responseBody.message).toEqual(
          `El test ha sido creado con éxito`,
        );
        // verify that the returned data matches the input data
        const createdSurvey = responseBody.data;
        // verify that the entity has a generated ID from the DB
        expect(createdSurvey.id).toBeDefined();
        // verify that the input data was reflected
        expect(createdSurvey.name).toEqual(newSurveyPayload.name);
        expect(createdSurvey.description).toEqual(newSurveyPayload.description);
        // verify that default fields are correct
        expect(createdSurvey.active).toBe(false);
        expect(createdSurvey.createdAt).toBeDefined();
        expect(createdSurvey.updatedAt).toBeDefined();
        expect(createdSurvey.deletedAt).toBeNull();
      });
  });

  // Data validation test (missing 'name' field)
  it('/survey (POST) - Should fail if the "name" field is missing', async () => {
    const invalidPayload = {
      // description: `Primer test creado para probar el crud de test (${nroTest})`,
      calcRisks: true,
    };
    console.log(invalidPayload);

    return await request(app.getHttpServer())
      .post('/survey')
      .set('app', 'panel')
      .set('Accept-Language', 'es')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'jest-test')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidPayload)
      .expect(400) // Expect status code 400 (Bad Request)
      .expect((res) => {
        // Validate the response body
        const responseBody = res.body;
        console.log(responseBody);

        expect(responseBody.statusCode).toBe(400);
        expect(responseBody.message).toBe('Bad Request');
      });
  });

  // Data validation test (duplicated 'name' unique field)
  it('/survey (POST) - Should fail if the "name" field is duplicated (in use)', async () => {
    const invalidPayload = {
      name: `Test de prueba nro ${nroTest}`,
      description: `Primer test creado para probar el crud de test (${nroTest})`,
      calcRisks: true,
    };
    console.log(invalidPayload);

    return await request(app.getHttpServer())
      .post('/survey')
      .set('app', 'panel')
      .set('Accept-Language', 'es')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'jest-test')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidPayload)
      .expect(400) // Expect status code 400 (Bad Request)
      .expect((res) => {
        // Validate the response body
        const responseBody = res.body;
        console.log(responseBody);

        expect(responseBody.statusCode).toBe(400);
        expect(responseBody.message).toBe('Bad request');
        expect(responseBody.errors).toBeDefined();
        expect(responseBody.errors).toContain(
          'Ya existe un test con ese mismo nombre y debe ser único, por favor verifique',
        );
      });
  });
});
