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
console.log("TELA VENDAS CARREGOU");
carregarEmpresa();
},[]);

// ================= EMPRESA
async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
alert("Usuário não logado");
return;
}

const { data, error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(error){
console.log(error);
alert("Erro empresa");
return;
}

if(!data?.empresa_id){
alert("Empresa não encontrada");
return;
}

console.log("EMPRESA ID:", data.empresa_id);

setEmpresaId(data.empresa_id);

carregarVendas(data.empresa_id);

}

// ================= LISTAR
async function carregarVendas(empId){

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

// ================= CALCULO
const kg = Number(kilos || 0);
const comissao = kg * 0.05;

// ================= SALVAR (🔥 CORRIGIDO DEFINITIVO)
async function salvarVenda(){

console.log("CLICK OK");

if(loading){
console.log("TRAVADO POR LOADING");
return;
}

try{

if(!empresaId){
alert("Empresa não carregada ainda");
return;
}

if(!produto){
alert("Informe o produto");
return;
}

const kg = Number(kilos);
if(kg <= 0){
alert("Kilos inválido");
return;
}

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
alert("Usuário não logado");
return;
}

setLoading(true);

const { error } = await supabase
.from("vendas")
.insert([{
empresa_id: empresaId,
cliente_nome: cliente || "",
produto: produto,
kilos: kg,
comissao: kg * 0.05,
data_venda: dataVenda,
user_id: user.id
}]);

if(error){
console.log("ERRO:", error);
alert("Erro: " + error.message);
return;
}

alert("Venda salva!");

setCliente("");
setProduto("");
setKilos("");

await carregarVendas(empresaId);

}catch(err){
console.log("ERRO GERAL:", err);
alert("Erro inesperado");

} finally {

// 🔥 ESSA LINHA RESOLVE O TRAVAMENTO
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

<button
onClick={salvarVenda}
disabled={loading}
style={{
padding:10,
background: loading ? "gray" : "green",
color:"#fff",
border:"none",
cursor:"pointer"
}}
>
{loading ? "Salvando..." : "Salvar Venda"}
</button>

<hr/>

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