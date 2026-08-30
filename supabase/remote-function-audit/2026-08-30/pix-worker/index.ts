Deno.serve(async (req) => {

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  // =========================
  // CORS PREFLIGHT
  // =========================
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const apiKey = Deno.env.get("ASAAS_API_KEY");
    const supabaseUrl =
      "https://leissgrymkxakjvurric.supabase.co";

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ erro: "API KEY NÃO ENCONTRADA" }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // =========================
    // CRIAR CLIENTE ASAAS
    // =========================
    const customerResponse = await fetch(
      "https://api-sandbox.asaas.com/v3/customers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        body: JSON.stringify({
          name: "Cliente Cunha Finance",
          email: "cliente@cunhafinance.com",
          cpfCnpj: "12345678909",
        }),
      }
    );

    const customerData = await customerResponse.json();

    // =========================
    // CRIAR COBRANÇA PIX
    // =========================
    const paymentResponse = await fetch(
      "https://api-sandbox.asaas.com/v3/payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        body: JSON.stringify({
          customer: customerData.id,
          billingType: "PIX",
          value: 5.00,
          dueDate: new Date().toISOString().split("T")[0],
          description: "Assinatura Cunha Finance",
        }),
      }
    );

    const paymentData = await paymentResponse.json();

    // =========================
    // SALVAR NO SUPABASE
    // =========================
    await fetch(
      `${supabaseUrl}/rest/v1/assinaturas`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey!,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          email: "cliente@cunhafinance.com",
          payment_id: paymentData.id,
          status: "pendente",
        }),
      }
    );

    // =========================
    // RETORNAR LINK PIX
    // =========================
    return new Response(
      JSON.stringify({
        pixLink: paymentData.invoiceUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({ erro: String(err) }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      }
    );
  }
});
