export interface IDatabaseConfig {
  getDatabaseUrl(): string;
  getDatabaseSchema(): string;
  getDatabaseSync(): boolean;
  getDatabaseLogs(): boolean;
  getDatabaseSlowQueryMaxTime(): number;
}
