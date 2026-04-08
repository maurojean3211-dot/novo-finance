import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Vendas(){

const [vendas,setVendas] = useState([]);

const [clienteNome,setClienteNome] = useState("");
const [produto,setProduto] = useState(""); // 🔥 LIVRE

const [quantidade,setQuantidade] = useState("");
const [precoUnitario,setPrecoUnitario] = useState("");

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

// ================= CARREGAR
async function carregarVendas(empresa_id){

const { data } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empresa_id)
.order("id",{ascending:false});

setVendas(data || []);
}

// ================= CALCULOS
const qtd = Number(quantidade || 0);
const preco = Number(precoUnitario || 0);

const valorTotal = qtd * preco;
const comissao = qtd * 0.05;

// ================= SALVAR
async function salvarVenda(){

if(!empresaId) return alert("Empresa não carregada");
if(!produto) return alert("Informe o produto");
if(qtd <= 0) return alert("Quantidade inválida");

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

// 🔥 SALVAR DIRETO COM PRODUTO TEXTO
const { error } = await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_nome: clienteNome,
produto: produto, // 🔥 AQUI CORRIGIDO
kilos: qtd,
preco_unitario: preco,
valor_total: valorTotal,
comissao: comissao,
data_venda: dataVenda,
user_id: user.id
}]);

if(error){
alert("Erro: " + error.message);
return;
}

alert("Venda salva!");

setClienteNome("");
setProduto("");
setQuantidade("");
setPrecoUnitario("");

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
value={clienteNome}
onChange={e=>setClienteNome(e.target.value)}
/>

<br/><br/>

<input
placeholder="Produto (livre)"
value={produto}
onChange={e=>setProduto(e.target.value)}
/>

<br/><br/>

<input
type="number"
placeholder="Kilos"
value={quantidade}
onChange={e=>setQuantidade(e.target.value)}
/>

<br/><br/>

<input
type="number"
placeholder="Valor por KG"
value={precoUnitario}
onChange={e=>setPrecoUnitario(e.target.value)}
/>

<br/><br/>

<p><strong>Comissão:</strong> R$ {comissao.toFixed(2)}</p>

<button onClick={salvarVenda}>
Salvar Venda
</button>

<hr/>

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
💰 R$ {Number(v.valor_total).toFixed(2)}

</div>

))}

</div>

);
}