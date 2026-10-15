// Ambient declarations for Deno globals in Supabase Edge Functions
// This resolves editor TypeScript linter warnings in Node/VSCode environments.

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: { port?: number; onListen?: (params: { port: number; hostname: string }) => void }
  ): void;
}

declare module "https://*" {
  export const createClient: any;
  export const serve: any;
  const anyExport: any;
  export default anyExport;
}
