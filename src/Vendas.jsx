import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Vendas(){

const [vendas,setVendas] = useState([]);

const [cliente,setCliente] = useState("");
const [produto,setProduto] = useState("");
const [kilos,setKilos] = useState("");

const [dataVenda,setDataVenda] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);
const [loading,setLoading] = useState(false);

// ================= INIT
useEffect(()=>{
carregarEmpresa();
},[]);

// ================= EMPRESA
async function carregarEmpresa(){

try{

const { data:{ user } } = await supabase.auth.getUser();
if(!user){
console.log("Sem usuário");
return;
}

const { data, error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(error){
console.log("Erro empresa:", error);
return;
}

if(!data?.empresa_id){
alert("Empresa não encontrada");
return;
}

setEmpresaId(data.empresa_id);

// 🔥 chama com valor direto (evita delay do state)
await carregarVendas(data.empresa_id);

}catch(err){
console.log("Erro geral empresa:", err);
}

}

// ================= LISTAR
async function carregarVendas(empId){

const { data, error } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empId)
.order("id",{ascending:false});

if(error){
console.log("Erro ao carregar vendas:", error);
return;
}

setVendas(data || []);
}

// ================= CALCULO
const kg = Number(kilos || 0);
const comissao = kg * 0.05;

// ================= SALVAR
async function salvarVenda(){

try{

if(loading) return; // 🔥 evita duplo clique
setLoading(true);

if(!empresaId){
alert("Empresa não carregada");
setLoading(false);
return;
}

if(!produto){
alert("Informe o produto");
setLoading(false);
return;
}

if(kg <= 0){
alert("Kilos inválido");
setLoading(false);
return;
}

const { data:{ user } } = await supabase.auth.getUser();
if(!user){
alert("Usuário não logado");
setLoading(false);
return;
}

// 🔥 DEBUG
console.log("SALVANDO:", {
empresaId,
cliente,
produto,
kg,
comissao
});

const { error } = await supabase
.from("vendas")
.insert([{
empresa_id: empresaId,
cliente_nome: cliente || "",
produto: produto,
kilos: kg,
comissao: comissao,
data_venda: dataVenda,
user_id: user.id
}]);

if(error){
console.error("ERRO SUPABASE:", error);
alert("Erro ao salvar:\n" + error.message);
setLoading(false);
return;
}

alert("Venda salva!");

// limpar
setCliente("");
setProduto("");
setKilos("");

// 🔥 recarrega lista corretamente
await carregarVendas(empresaId);

setLoading(false);

}catch(err){
console.error("ERRO GERAL:", err);
alert("Erro inesperado: " + err.message);
setLoading(false);
}

}

// ================= TELA
return(

<div style={{padding:20}}>

<h1>🛒 Vendas</h1>

<input
type="date"
value={dataVenda}
onChange={e=>setDataVenda(e.target.value)}
/>

<br/><br/>

<input
placeholder="Cliente"
value={cliente}
onChange={e=>setCliente(e.target.value)}
/>

<br/><br/>

<input
placeholder="Produto"
value={produto}
onChange={e=>setProduto(e.target.value)}
/>

<br/><br/>

<input
type="number"
placeholder="Kilos"
value={kilos}
onChange={e=>setKilos(e.target.value)}
/>

<br/><br/>

<p><strong>Comissão:</strong> R$ {comissao.toFixed(2)}</p>

<button onClick={salvarVenda} disabled={loading}>
{loading ? "Salvando..." : "Salvar Venda"}
</button>

<hr/>

<h3>📊 Vendas</h3>

{vendas.map(v=>(

<div key={v.id} style={{
border:"1px solid #ccc",
padding:10,
marginBottom:10
}}>

📅 {v.data_venda} <br/>
👤 {v.cliente_nome || "-"} <br/>
📦 {v.produto} <br/>
⚖️ {v.kilos} kg <br/>
💸 Comissão: R$ {Number(v.comissao || 0).toFixed(2)}

</div>

))}

</div>

);

}