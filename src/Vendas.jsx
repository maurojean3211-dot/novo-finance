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
const [carregandoEmpresa,setCarregandoEmpresa] = useState(true);
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
alert("Usuário não logado");
setCarregandoEmpresa(false);
return;
}

const { data, error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(error){
console.log(error);
alert("Erro ao carregar empresa");
setCarregandoEmpresa(false);
return;
}

if(!data?.empresa_id){
alert("Empresa não encontrada");
setCarregandoEmpresa(false);
return;
}

// 🔥 DEFINE E USA NA HORA
const empId = data.empresa_id;

setEmpresaId(empId);

await carregarVendas(empId);

setCarregandoEmpresa(false);

}catch(err){
console.log(err);
setCarregandoEmpresa(false);
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
console.log(error);
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

if(carregandoEmpresa){
return alert("Aguarde carregar a empresa...");
}

if(!empresaId){
return alert("Empresa não carregada");
}

if(!produto){
return alert("Informe o produto");
}

if(kg <= 0){
return alert("Kilos inválido");
}

const { data:{ user } } = await supabase.auth.getUser();
if(!user){
return alert("Usuário não logado");
}

setLoading(true);

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
console.log(error);
alert("Erro: " + error.message);
setLoading(false);
return;
}

alert("Venda salva!");

setCliente("");
setProduto("");
setKilos("");

await carregarVendas(empresaId);

setLoading(false);

}catch(err){
console.log(err);
alert("Erro inesperado");
setLoading(false);
}

}

// ================= LOADING
if(carregandoEmpresa){
return <div style={{padding:20}}>Carregando empresa...</div>;
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