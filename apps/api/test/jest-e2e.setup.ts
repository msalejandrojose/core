import { config } from 'dotenv';
import { resolve } from 'node:path';

// Carga `.env.test` en `process.env` antes de que `AppModule` (y su
// `ConfigModule.forRoot`) arranquen dentro de cada spec. `dotenv` no
// sobreescribe claves ya presentes, así que esto siempre gana sobre
// `.env`/`.env.local` para las variables que define.
config({ path: resolve(__dirname, '../.env.test') });
