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

// INIT
useEffect(()=>{
carregarEmpresa();
},[]);

async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

const { data } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(!data?.empresa_id) return;

setEmpresaId(data.empresa_id);
carregarVendas(data.empresa_id);
}

// ================= LISTAR
async function carregarVendas(empresa_id){

const { data } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empresa_id)
.order("id",{ascending:false});

setVendas(data || []);
}

// ================= CALCULO
const kg = Number(kilos || 0);
const comissao = kg * 0.05;

// ================= SALVAR
async function salvarVenda(){

if(!empresaId) return alert("Empresa não carregada");
if(!produto) return alert("Informe o produto");
if(kg <= 0) return alert("Kilos inválido");

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

const { error } = await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_nome: cliente,
produto: produto,
kilos: kg,
comissao: comissao,
data_venda: dataVenda,
user_id: user.id
}]);

if(error){
alert("Erro: " + error.message);
return;
}

alert("Venda salva!");

setCliente("");
setProduto("");
setKilos("");

carregarVendas(empresaId);
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
Salvar Venda
</button>

<hr/>

<h3>📊 Total Comissão</h3>

{vendas.map(v=>(

<div key={v.id} style={{
border:"1px solid #ccc",
padding:10,
marginBottom:10
}}>

📅 {v.data_venda} <br/>
👤 {v.cliente_nome} <br/>
📦 {v.produto} <br/>
⚖️ {v.kilos} kg <br/>
💸 Comissão: R$ {Number(v.comissao).toFixed(2)}

</div>

))}

</div>

);
}