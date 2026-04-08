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

const empId = data.empresa_id;

setEmpresaId(empId);

// 🔥 chama direto
carregarVendas(empId);

}catch(err){
console.log(err);
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

if(loading) return;

if(!empresaId){
alert("Empresa ainda não carregou, aguarde 1 segundo e tente novamente.");
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

<button onClick={salvarVenda}>
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