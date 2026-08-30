import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const { nome, email, valor, descricao } = body;

    const cobranca = {
      id: crypto.randomUUID(),
      cliente: nome,
      email: email,
      valor: valor,
      descricao: descricao,
      status: "pendente",
      data: new Date().toISOString(),
      link_pagamento:
        "https://pagamento.exemplo.com/" + crypto.randomUUID(),
    };

    return new Response(
      JSON.stringify({
        sucesso: true,
        cobranca,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
