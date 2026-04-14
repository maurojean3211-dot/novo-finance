import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  // Busca o PIX salvo no navegador ou usa o padrão se não existir
  const [pixChave, setPixChave] = useState(() => {
    return localStorage.getItem("chave_pix") || "11963068079";
  });
  
  const [pixEdit, setPixEdit] = useState(() => {
    return localStorage.getItem("chave_pix") || "11963068079";
  });

  const [dados, setDados] = useState([]);
  const [empresaRealId, setEmpresaRealId] = useState(null);

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não logado");
      return;
    }

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .maybeSingle();

    if (error) {
      alert("Erro usuário: " + error.message);
      return;
    }

    if (!usuario?.empresa_id) {
      alert("Empresa não encontrada");
      return;
    }

    setEmpresaRealId(usuario.empresa_id);
    await carregarDados(usuario.empresa_id);
  }

  async function carregarDados(empresa_id) {
    const idParaBusca = empresa_id || empresaRealId;
    if (!idParaBusca) return;

    const { data, error } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", idParaBusca)
      .order("data_vencimento", { ascending: true });

    if (error) {
      alert("Erro empréstimos: " + error.message);
      return;
    }

    setDados(data || []);
  }

  // NOVA FUNÇÃO: Agora salva permanentemente no navegador
  function salvarPix() {
    setPixChave(pixEdit);
    localStorage.setItem("chave_pix", pixEdit); 
    alert("✅ PIX salvo permanentemente neste navegador!");
  }

  async function salvar() {
    if (!cliente || !valor || !dataVencimento) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    if (!empresaRealId) {
      alert("Empresa não carregada. Tente atualizar a página.");
      return;
    }

    const valorBase = Number(valor);
    const jurosPct = Number(juros || 0);
    const total = valorBase + (valorBase * jurosPct) / 100;

    const { error } = await supabase
      .from("emprestimos")
      .insert([{
        empresa_id: empresaRealId,
        cliente,
        telefone,
        valor: valorBase,
        juros: jurosPct,
        total,
        data_vencimento: dataVencimento,
        status: "pendente",
      }]);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    // Limpa campos
    setCliente("");
    setTelefone("");
    setValor("");
    setJuros("");
    setDataVencimento("");

    carregarDados(empresaRealId);
  }

  async function marcarPago(id) {
    const { error } = await supabase
      .from("emprestimos")
      .update({ status: "pago" })
      .eq("id", id);

    if (error) alert("Erro ao pagar: " + error.message);
    carregarDados(empresaRealId);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir empréstimo?")) return;

    const { error } = await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    if (error) alert("Erro ao excluir: " + error.message);
    carregarDados(empresaRealId);
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function cobrar(p) {
    let numero = String(p.telefone || "").replace(/\D/g, "");
    if (!numero) {
      alert("Cliente sem telefone cadastrado");
      return;
    }
    if (!numero.startsWith("55")) numero = "55" + numero;

    const msg = `Olá ${p.cliente}%0A%0ASeu empréstimo está pendente.%0A%0AValor total: R$ ${Number(p.total).toFixed(2)}%0AVencimento: ${formatarData(p.data_vencimento)}%0A%0A*PIX para pagamento:*%0A${pixChave}`;

    window.open(`https://wa.me{numero}?text=${msg}`, "_blank");
  }

  const dadosFiltrados = dados.filter((p) =>
    String(p.cliente || "").toLowerCase().includes(busca.toLowerCase())
  );

  const totalCarteira = dados.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPago = dados.filter((i) => i.status === "pago").reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPendente = totalCarteira - totalPago;

  return (
    <div style={{ padding: 20, color: "#fff", maxWidth: 700, margin: "auto", fontFamily: "sans-serif" }}>
      <h2>💰 Gestão de Empréstimos</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: 20 }}>
        <div style={{ background: "#374151", padding: 10, borderRadius: 5, flex: 1 }}>
          <small>Carteira</small><br/><strong>R$ {totalCarteira.toFixed(2)}</strong>
        </div>
        <div style={{ background: "#059669", padding: 10, borderRadius: 5, flex: 1 }}>
          <small>Pago</small><br/><strong>R$ {totalPago.toFixed(2)}</strong>
        </div>
        <div style={{ background: "#dc2626", padding: 10, borderRadius: 5, flex: 1 }}>
          <small>Pendente</small><br/><strong>R$ {totalPendente.toFixed(2)}</strong>
        </div>
      </div>

      <div style={{ background: "#1f2937", padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <h3>⚙️ Configuração de Recebimento</h3>
        <label>Chave PIX atual para cobranças:</label>
        <input
          value={pixEdit}
          onChange={(e) => setPixEdit(e.target.value)}
          placeholder="Celular, CPF ou E-mail"
          style={{ width: "100%", padding: 10, marginTop: 5, borderRadius: 5, border: "none" }}
        />
        <button onClick={salvarPix} style={{ marginTop: 10, width: "100%", padding: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
          Salvar Chave PIX
        </button>
      </div>

      <div style={{ background: "#1f2937", padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <h3>📝 Novo Empréstimo</h3>
        <input placeholder="Nome do Cliente" value={cliente} onChange={e => setCliente(e.target.value)} style={inputStyle} />
        <input placeholder="WhatsApp (com DDD)" value={telefone} onChange={e => setTelefone(e.target.value)} style={inputStyle} />
        <input placeholder="Valor Emprestado (R$)" type="number" value={valor} onChange={e => setValor(e.target.value)} style={inputStyle} />
        <input placeholder="Juros (%)" type="number" value={juros} onChange={e => setJuros(e.target.value)} style={inputStyle} />
        <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} style={inputStyle} />
        <button onClick={salvar} style={{ ...buttonStyle, background: "#059669" }}>Lançar Empréstimo</button>
      </div>

      <input 
        placeholder="🔍 Buscar cliente..." 
        value={busca} 
        onChange={e => setBusca(e.target.value)} 
        style={{ ...inputStyle, marginBottom: 10 }} 
      />

      {dadosFiltrados.map((p) => (
        <div key={p.id} style={{ background: p.status === 'pago' ? '#064e3b' : '#374151', padding: 15, borderRadius: 8, marginBottom: 10, borderLeft: p.status === 'pendente' ? '5px solid #ef4444' : '5px solid #10b981' }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{p.cliente}</strong>
            <span>R$ {Number(p.total).toFixed(2)}</span>
          </div>
          <p style={{ fontSize: 12, margin: "5px 0" }}>Vence em: {formatarData(p.data_vencimento)}</p>
          
          <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
            {p.status === "pendente" && (
              <>
                <button onClick={() => cobrar(p)} style={actionBtn}>WhatsApp</button>
                <button onClick={() => marcarPago(p.id)} style={actionBtn}>Pagar</button>
              </>
            )}
            <button onClick={() => excluir(p.id)} style={{ ...actionBtn, background: "#991b1b" }}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const inputStyle = { width: "100%", padding: 10, marginBottom: 10, borderRadius: 5, border: "1px solid #374151", background: "#111827", color: "#fff" };
const buttonStyle = { width: "100%", padding: 12, border: "none", borderRadius: 5, color: "#fff", fontWeight: "bold", cursor: "pointer" };
const actionBtn = { padding: "5px 10px", fontSize: 12, borderRadius: 4, border: "none", background: "#4b5563", color: "#fff", cursor: "pointer" };
