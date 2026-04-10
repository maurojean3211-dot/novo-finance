import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Compras() {

const [compras, setCompras] = useState([]);

const [fornecedor, setFornecedor] = useState("");
const [produto, setProduto] = useState("");
const [kilos, setKilos] = useState("");

const [dataCompra, setDataCompra] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);
const [userEmail,setUserEmail] = useState(null);

const [editandoId,setEditandoId] = useState(null);
const [busca,setBusca] = useState("");

// ================= INIT
useEffect(() => {
carregarEmpresa();
}, []);

// ================= EMPRESA
async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
alert("Usuário não logado");
return;
}

setUserEmail(user.email);

// 🔥 BUSCA CORRETA PELO EMAIL
const { data, error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("email", user.email)
.single();

if(error){
console.log("ERRO EMPRESA:", error);
alert("Erro ao buscar empresa");
return;
}

if(!data?.empresa_id){
alert("Empresa não encontrada");
return;
}

setEmpresaId(data.empresa_id);

// 🔥 AGUARDA carregar
await carregarCompras(data.empresa_id);
}

// 🔒 BLOQUEIO
if(userEmail && userEmail !== "maurojean3211@gmail.com"){
return <div style={{padding:20,color:"#fff"}}>⛔ Acesso restrito</div>;
}

// ================= LISTAR COMPRAS
async function carregarCompras(empId){

if(!empId) return;

const { data, error } = await supabase
.from("compras")
.select("*")
.eq("empresa_id", empId)
.order("id",{ascending:false});

if(error){
console.log("ERRO AO BUSCAR:", error);
return;
}

setCompras(data || []);
}

// ================= COMISSÃO (REGRA FINAL)
function calcularComissao(){

const nome = (produto || "").toUpperCase();
const kg = Number(kilos || 0);

if(nome.includes("LIMALHA") || nome.includes("CAVACO")){
return kg * 0.07; // 🔥 7 centavos
}

return kg * 0.05; // 🔥 5 centavos (sucata)
}

// ================= FILTRO
const comprasFiltradas = compras.filter(c =>
(c.fornecedor || "")
.toLowerCase()
.includes(busca.toLowerCase())
);

// ================= SALVAR
async function salvarCompra(){

if(!empresaId){
alert("Empresa ainda não carregada");
return;
}

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
alert("Usuário não carregado");
return;
}

if(!produto){
alert("Informe o produto");
return;
}

if(!kilos || Number(kilos) <= 0){
alert("Kilos inválido");
return;
}

const comissao = calcularComissao();

let error;

if(editandoId){

({ error } = await supabase
.from("compras")
.update({
fornecedor,
produto,
kilos: Number(kilos),
comissao,
data_compra: dataCompra
})
.eq("id", editandoId));

if(error){
alert(error.message);
return;
}

alert("Atualizado!");
setEditandoId(null);

}else{

({ error } = await supabase
.from("compras")
.insert([{
empresa_id: empresaId,
fornecedor,
produto,
kilos: Number(kilos),
comissao,
data_compra: dataCompra,
user_id: user.id
}]));

if(error){
alert(error.message);
return;
}

alert("Compra salva!");
}

// 🔥 LIMPAR
setFornecedor("");
setProduto("");
setKilos("");

// 🔥 RECARREGAR
await carregarCompras(empresaId);
}

// ================= EDITAR
function editarCompra(c){

setEditandoId(c.id);
setFornecedor(c.fornecedor || "");
setProduto(c.produto || "");
setKilos(c.kilos || "");
setDataCompra(c.data_compra || "");

window.scrollTo({top:0,behavior:"smooth"});
}

// ================= EXCLUIR
async function excluirCompra(id){

if(!confirm("Excluir?")) return;

await supabase
.from("compras")
.delete()
.eq("id", id);

await carregarCompras(empresaId);
}

// ================= PREVIEW
const comissaoPreview = calcularComissao();

// ================= TELA
return(

<div style={{padding:20}}>

<h1>📦 {editandoId ? "Editar Compra" : "Compras"}</h1>

<input
type="date"
value={dataCompra}
onChange={e=>setDataCompra(e.target.value)}
/>

<br/><br/>

<input
placeholder="Fornecedor"
value={fornecedor}
onChange={e=>setFornecedor(e.target.value)}
/>

<br/><br/>

<input
placeholder="Produto (sucata, limalha ou cavaco)"
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

<p><strong>Comissão:</strong> R$ {comissaoPreview.toFixed(2)}</p>

<button
onClick={salvarCompra}
style={{
padding:10,
background: editandoId ? "orange" : "green",
color:"#fff",
border:"none",
borderRadius:5
}}
>
{editandoId ? "Atualizar" : "Salvar"}
</button>

<hr/>

<h3>🔍 Buscar fornecedor</h3>

<input
placeholder="Digite o nome"
value={busca}
onChange={e=>setBusca(e.target.value)}
/>

<hr/>

{comprasFiltradas.map(c=>(

<div key={c.id} style={{
border:"1px solid #ccc",
padding:10,
marginBottom:10,
borderRadius:5
}}>

📅 {c.data_compra} <br/>
👤 {c.fornecedor || "-"} <br/>
📦 {c.produto} <br/>
⚖️ {c.kilos} kg <br/>
💸 Comissão: R$ {Number(c.comissao || 0).toFixed(2)}

<br/><br/>

<button onClick={()=>editarCompra(c)}>
✏️ Editar
</button>

<button
onClick={()=>excluirCompra(c.id)}
style={{
marginLeft:10,
background:"red",
color:"#fff",
border:"none",
padding:"5px 10px"
}}
>
🗑️ Excluir
</button>

</div>

))}

</div>

);
}