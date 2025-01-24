export interface IFirebaseEnvConfig {
  getFirebaseProjectId(): string;
  getFirebaseClientEmail(): string;
  getFirebasePrivateKey(): string;
  getFirebaseBlockSize(): number;
}
