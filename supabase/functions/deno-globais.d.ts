// Declaração mínima do global Deno, só para o tsc do repositório conferir os index.ts das
// Edge Functions. No deploy, o runtime do Supabase usa os tipos reais do Deno.
declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown
  const env: { get(nome: string): string | undefined }
}
