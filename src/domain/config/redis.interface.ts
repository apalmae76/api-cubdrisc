export interface IRedisConfig {
  getRedisHost(): string;
  getRedisPort(): number;
  getRedisPass(): string;
}
