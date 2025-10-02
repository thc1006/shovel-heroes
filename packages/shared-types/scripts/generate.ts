import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(process.cwd(), 'api-spec/openapi.yaml');
const outDir = path.resolve(process.cwd(), 'packages/shared-types/src');
fs.mkdirSync(outDir, { recursive: true });

// In real use, call openapi-typescript or similar. Here we just emit a stub.
const dts = `// Generated from ${src}
export namespace components {
  export namespace schemas {
    export interface Grid { id: string; name: string; area_id?: string }
    export interface Healthz { status: string; db: string }
  }
}
`;
fs.writeFileSync(path.join(outDir, 'openapi.ts'), dts, 'utf8');
console.log('Wrote shared types to packages/shared-types/src/openapi.ts');
