export interface IJWTConfig {
  getJwtTokenSecret(): string;
  getJwtTokenExpirationTime(): string;
  getJwtRefreshTokenSecret(): string;
  getJwtRefreshTokenExpirationTime(): string;
}
