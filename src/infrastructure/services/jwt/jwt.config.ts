import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';

export const getJwtModuleOptions = (appConfig: EnvironmentConfigService) => {
  const options = {
    secret: appConfig.getJwtTokenSecret(),
    signOptions: {
      expiresIn: `${appConfig.getJwtTokenExpirationTime()}s`,
    },
  };
  //* console.log(`////-- Jwt Conf --${JSON.stringify(options, null, 2)}--////`);
  return options;
};
