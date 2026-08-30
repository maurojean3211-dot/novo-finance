import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const { nome, email } = await req.json();

  const pixLink =
    "https://pagamento-teste.com/pix/" + Date.now();

  return new Response(
    JSON.stringify({
      success: true,
      pixLink
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
});
