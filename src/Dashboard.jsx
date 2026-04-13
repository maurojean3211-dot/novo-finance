import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Dashboard() {
  const [receitas, setReceitas] = useState(0);
  const [pendente, setPendente] = useState(0);

  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPagos, setTotalPagos] = useState(0);
  const [totalBloqueados, setTotalBloqueados] = useState(0);
  const [totalIsentos, setTotalIsentos] = useState(0);

  const [isMaster, setIsMaster] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCarregando(false);
      return;
    }

    // 🔥 MASTER (SEU LOGIN)
    if (user.email === "maurojean3211@gmail.com") {
      setIsMaster(true);
      await carregarMaster();
    } else {
      setIsMaster(false);
      await carregarUsuario(user.id);
    }

    setCarregando(false);
  }

  // ================= DASHBOARD MASTER
  async function carregarMaster() {
    const { data, error } = await supabase
      .from("empresas")
      .select("*");

    if (error) {
      alert(error.message);
      return;
    }

    let recebido = 0;
    let pend = 0;
    let pagos = 0;
    let bloqueados = 0;
    let isentos = 0;

    (data || []).forEach((c) => {
      const valor = Number(c.valor || 0);

      if (c.status === "Bloqueado")
        bloqueados++;

      if (c.isento === true) {
        isentos++;
        return;
      }

      const pagou =
        c.pagou === true ||
        c.pagou === "true" ||
        c.pagou === 1 ||
        c.pagou === "1" ||
        c.pagou === "Pago" ||
        c.pagou === "SIM" ||
        c.pagou === "sim";

      if (pagou) {
        recebido += valor;
        pagos++;
      } else {
        pend += valor;
      }
    });

    setReceitas(recebido);
    setPendente(pend);
    setTotalClientes(data.length);
    setTotalPagos(pagos);
    setTotalBloqueados(bloqueados);
    setTotalIsentos(isentos);
  }

  // ================= DASHBOARD USUÁRIO ALUGADO
  async function carregarUsuario(userId) {
    const { data: usuario } =
      await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("id", userId)
        .maybeSingle();

    if (!usuario?.empresa_id) return;

    const { data } = await supabase
      .from("recebimentos")
      .select("*")
      .eq("empresa_id", usuario.empresa_id);

    let recebido = 0;
    let pend = 0;
    let pagos = 0;

    (data || []).forEach((r) => {
      const valor = Number(r.valor || 0);

      const pago =
        String(r.status || "")
          .toLowerCase()
          .trim() === "pago";

      if (pago) {
        recebido += valor;
        pagos++;
      } else {
        pend += valor;
      }
    });

    setReceitas(recebido);
    setPendente(pend);
    setTotalClientes(data?.length || 0);
    setTotalPagos(pagos);
    setTotalBloqueados(0);
    setTotalIsentos(0);
  }

  // ================= LOADING
  if (carregando) {
    return (
      <div
        style={{
          padding: 20,
          color: "#fff",
        }}
      >
        Carregando...
      </div>
    );
  }

  // ================= VIEW MASTER
  if (isMaster) {
    return (
      <div
        style={{
          padding: 20,
          color: "#fff",
        }}
      >
        <h2>📊 Dashboard MASTER</h2>

        <p>
          💰 Recebido: R$ {receitas}
        </p>
        <p>
          ⏳ Pendente: R$ {pendente}
        </p>
        <p>
          📊 Total: R${" "}
          {receitas + pendente}
        </p>

        <hr />

        <p>
          👥 Clientes:{" "}
          {totalClientes}
        </p>
        <p>
          ✅ Pagos: {totalPagos}
        </p>
        <p>
          🚫 Bloqueados:{" "}
          {totalBloqueados}
        </p>
        <p>
          🆓 Isentos:{" "}
          {totalIsentos}
        </p>
      </div>
    );
  }

  // ================= VIEW USUÁRIO ALUGADO
  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
      }}
    >
      <h2>📊 Dashboard</h2>

      <p>
        💰 Recebido: R$ {receitas}
      </p>

      <p>
        ⏳ A Receber: R$ {pendente}
      </p>

      <p>
        📊 Total: R${" "}
        {receitas + pendente}
      </p>

      <hr />

      <p>
        📄 Recebimentos:{" "}
        {totalClientes}
      </p>

      <p>
        ✅ Pagos: {totalPagos}
      </p>

      <p>
        🕒 Pendentes:{" "}
        {totalClientes -
          totalPagos}
      </p>
    </div>
  );
}