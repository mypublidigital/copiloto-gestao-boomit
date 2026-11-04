// Declaração mínima do global Deno, só para o tsc do repositório conferir os index.ts das
// Edge Functions. No deploy, o runtime do Supabase usa os tipos reais do Deno.
declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown
  const env: { get(nome: string): string | undefined }
}

// Supabase Edge Runtime: mantém a função viva até a promessa terminar (tarefa em segundo plano).
declare const EdgeRuntime: { waitUntil(promessa: Promise<unknown>): void }
