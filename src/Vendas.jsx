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
const [userId,setUserId] = useState(null);

const [editandoId,setEditandoId] = useState(null);

// 🔍 BUSCA
const [busca,setBusca] = useState("");

// ================= INIT
useEffect(()=>{
carregarEmpresa();
},[]);

// ================= EMPRESA
async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
alert("Usuário não logado");
return;
}

setUserId(user.id);

const { data, error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("email", user.email) // ✅ CORRIGIDO
.single();

if(error){
console.log(error);
alert("Erro ao buscar empresa");
return;
}

if(!data?.empresa_id){
alert("Empresa não encontrada no usuário");
return;
}

setEmpresaId(data.empresa_id);

carregarVendas(data.empresa_id);

}

// ================= LISTAR
async function carregarVendas(empId){

if(!empId) return;

const { data, error } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empId)
.order("id",{ascending:false});

if(error){
console.log(error);
return;
}

setVendas(data || []);
}

// ================= EXCLUIR
async function excluirVenda(id){

if(!confirm("Excluir venda?")) return;

await supabase.from("vendas").delete().eq("id",id);

carregarVendas(empresaId);

}

// ================= EDITAR
function editarVenda(v){

setEditandoId(v.id);

setCliente(v.cliente_nome || "");
setProduto(v.produto || "");
setKilos(v.kilos || "");
setDataVenda(v.data_venda || "");

window.scrollTo({top:0,behavior:"smooth"});

}

// ================= CALCULO
const kg = Number(kilos || 0);
const comissao = kg * 0.05;

// ================= SALVAR
async function salvarVenda(){

if(!empresaId){
alert("Empresa ainda não carregada");
return;
}

if(!userId){
alert("Usuário não carregado");
return;
}

if(!produto){
alert("Informe o produto");
return;
}

if(kg <= 0){
alert("Kilos inválido");
return;
}

// 🔥 EDITAR
if(editandoId){

const { error } = await supabase
.from("vendas")
.update({
cliente_nome: cliente,
produto,
kilos: kg,
comissao,
data_venda: dataVenda
})
.eq("id",editandoId);

if(error){
alert("Erro: " + error.message);
return;
}

alert("Atualizado!");

setEditandoId(null);

}else{

// 🔥 NOVO
const { error } = await supabase
.from("vendas")
.insert([{
empresa_id: empresaId,
cliente_nome: cliente || "",
produto,
kilos: kg,
comissao,
data_venda: dataVenda,
user_id: userId
}]);

if(error){
alert("Erro: " + error.message);
return;
}

alert("Venda salva!");

}

// limpar
setCliente("");
setProduto("");
setKilos("");

carregarVendas(empresaId);

}

// ================= FILTRO BUSCA
const vendasFiltradas = vendas.filter(v =>
(v.cliente_nome || "")
.toLowerCase()
.includes(busca.toLowerCase())
);

// ================= TELA
return(

<div style={{padding:20}}>

<h1>🛒 {editandoId ? "Editar Venda" : "Vendas"}</h1>

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

<button
onClick={salvarVenda}
style={{
padding:10,
background: editandoId ? "orange" : "green",
color:"#fff",
border:"none"
}}
>
{editandoId ? "Atualizar" : "Salvar Venda"}
</button>

<hr/>

<h3>🔍 Buscar Cliente</h3>

<input
placeholder="Digite o nome do cliente"
value={busca}
onChange={e=>setBusca(e.target.value)}
/>

<hr/>

{vendasFiltradas.map(v=>(

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

<br/><br/>

<button onClick={()=>editarVenda(v)}>
✏️ Editar
</button>

<button
onClick={()=>excluirVenda(v.id)}
style={{marginLeft:10,background:"red",color:"#fff"}}
>
🗑️ Excluir
</button>

</div>

))}

</div>

);
}