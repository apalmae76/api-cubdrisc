import { Injectable } from '@nestjs/common';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { IVerifyEmailServicePayload } from 'src/domain/adapters/verify-email.interface';
import {
  IJwtService,
  IJwtServicePayload,
} from '../../../domain/adapters/jwt.interface';

@Injectable()
export class JwtTokenService implements IJwtService {
  constructor(private readonly jwtService: JwtService) { }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkToken(token: string, options?: JwtVerifyOptions): any {
    if (!options) {
      options = <JwtVerifyOptions>{
        secret: process.env.JWT_TOKEN_SECRET,
        signOptions: {
          expiresIn: `${process.env.JWT_TOKEN_EXPIRATION_TIME}s`,
        },
      };
    }
    const decode = this.jwtService.verify(token, options);
    return decode;
  }

  createAuthToken(
    payload: IJwtServicePayload,
    secret: string,
    expiresIn: string,
  ): string {
    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
    });
  }

  createVerifyMailToken(
    payload: IVerifyEmailServicePayload,
    secret: string,
    expiresIn: string,
  ): string {
    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
    });
  }
}
