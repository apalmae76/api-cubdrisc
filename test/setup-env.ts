import * as dotenv from 'dotenv';
import * as path from 'path';

console.log('🔧 Configurando entorno para tests...');
// Cargar el .env de desarrollo
const envPath = path.resolve(process.cwd(), '.env');
console.log('Cargando .env desde:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ ERROR cargando .env:', result.error.message);
  throw result.error;
}
// Verificar variables críticas
const minRequiredVars = ['NODE_ENV', 'DATABASE_URL'];
minRequiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.warn(`⚠️  Advertencia: ${varName} no está definida`);
  }
});
// Force NODE_ENV=local if not defined
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'local';
  console.log('🔧 NODE_ENV forced to: local');
}
