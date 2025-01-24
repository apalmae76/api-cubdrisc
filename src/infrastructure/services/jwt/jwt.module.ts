import { Module } from '@nestjs/common';
import { JwtModule as Jwt } from '@nestjs/jwt';
import { EnvironmentConfigModule } from '../../config/environment-config/environment-config.module';
import { EnvironmentConfigService } from '../../config/environment-config/environment-config.service';
import { getJwtModuleOptions } from './jwt.config';
import { JwtTokenService } from './jwt.service';

@Module({
  imports: [
    Jwt.registerAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService],
      useFactory: (envCfgServ: EnvironmentConfigService) =>
        getJwtModuleOptions(envCfgServ),
    }),
  ],
  providers: [JwtTokenService],
  exports: [JwtTokenService],
})
export class JwtModule {}
