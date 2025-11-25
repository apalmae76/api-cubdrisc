// test/auth-helper.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export class AuthTestHelper {
  static async loginAndGetToken(
    app: INestApplication,
    credentials: { email: string; otpCode: string },
  ): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/mail-login/otp')
      .set('app', 'panel')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'jest-test')
      .set('Accept-Language', 'es')
      .send(credentials)
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/auth/mail-login/token')
      .set('app', 'panel')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'jest-test')
      .set('Accept-Language', 'es')
      .send(credentials)
      .expect(201);

    return response.body?.data?.accessToken ?? null;
  }

  static async refreshAndGetToken(
    app: INestApplication,
    refreshToken: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('app', 'panel')
      .set('Accept-Language', 'es')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'jest-test')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(201);

    return response.body.data.accessToken;
  }

  // Método para obtener token de un usuario de prueba
  static async getValidToken(app: INestApplication): Promise<string> {
    // Usar credenciales de un usuario de prueba
    const credentials = {
      email: 'pepe88@tesis.edu',
      otpCode: '535805',
    };

    try {
      return await this.loginAndGetToken(app, credentials);
    } catch (er) {
      throw new Error(`Ends with erros; ${er.message ?? 'No error message'}`);
    }
  }
}
