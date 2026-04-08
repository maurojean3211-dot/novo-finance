import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Compras() {

const [compras, setCompras] = useState([]);
const [produtos, setProdutos] = useState([]);

const [fornecedor, setFornecedor] = useState("");
const [produtoId, setProdutoId] = useState("");
const [kilos, setKilos] = useState("");
const [preco, setPreco] = useState("");

const [dataCompra, setDataCompra] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);
const [userEmail,setUserEmail] = useState(null);

// 🔥 NOVO
const [editandoId,setEditandoId] = useState(null);
const [busca,setBusca] = useState("");

useEffect(() => {
carregarEmpresa();
}, []);

// ================= EMPRESA
async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

setUserEmail(user.email);

const { data } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(!data?.empresa_id) return;

setEmpresaId(data.empresa_id);

await carregarProdutos(data.empresa_id);
await carregarCompras(data.empresa_id);
}

// 🔒 BLOQUEIO
if(userEmail && userEmail !== "maurojean3211@gmail.com"){
return <div style={{padding:20,color:"#fff"}}>⛔ Acesso restrito</div>;
}

// ================= PRODUTOS
async function carregarProdutos(empresa_id) {

const { data } = await supabase
.from("produtos")
.select("id,nome")
.eq("empresa_id",empresa_id)
.order("nome");

setProdutos(data || []);
}

// ================= COMPRAS
async function carregarCompras(empresa_id) {

const { data } = await supabase
.from("compras")
.select(`*, produtos(nome)`)
.eq("empresa_id",empresa_id)
.order("id", { ascending:false });

setCompras(data || []);
}

// ================= COMISSÃO
function calcularComissao(){

const produto = produtos.find(p => p.id == produtoId);
const nome = (produto?.nome || "").toUpperCase();

const kg = Number(kilos || 0);

if(nome.includes("SUCATA")) return kg * 0.05;
if(nome.includes("CAVACO") || nome.includes("LIMALHA")) return kg * 0.07;

return 0;
}

// ================= FILTRO
const comprasFiltradas = compras.filter(c =>
(c.fornecedor || "").toLowerCase().includes(busca.toLowerCase())
);

// ================= SALVAR
async function salvarCompra() {

if(!empresaId) return alert("Empresa não carregada");

const { data: { user } } = await supabase.auth.getUser();
if (!user) return;

if (!produtoId) return alert("Selecione o produto");
if (!kilos) return alert("Informe os kilos");
if (!preco) return alert("Informe o preço");

const produto = produtos.find(p => p.id === produtoId);

const valorTotal = Number(kilos) * Number(preco);
const comissao = calcularComissao();

// 🔥 EDITAR OU NOVO
if(editandoId){

const { error } = await supabase
.from("compras")
.update({
fornecedor,
produto_id: produtoId,
kilos: Number(kilos),
preco_compra: Number(preco),
valor_total: valorTotal,
comissao,
data_compra: dataCompra
})
.eq("id",editandoId);

if(error) return alert(error.message);

alert("Compra atualizada!");
setEditandoId(null);

}else{

const { error } = await supabase
.from("compras")
.insert([{
empresa_id:empresaId,
fornecedor,
produto_id: produtoId,
kilos: Number(kilos),
preco_compra: Number(preco),
valor_total: valorTotal,
comissao,
data_compra: dataCompra,
user_id: user.id
}]);

if (error) return alert(error.message);

// financeiro
await supabase.from("lancamentos").insert([{
empresa_id:empresaId,
tipo: "despesa",
categoria: "Compras",
descricao: `Compra ${produto?.nome || ""}`,
valor: valorTotal,
data_lancamento: new Date(dataCompra).toISOString(),
mes: new Date(dataCompra).getMonth() + 1,
ano: new Date(dataCompra).getFullYear()
}]);

alert("Compra salva!");
}

// limpar
setFornecedor("");
setProdutoId("");
setKilos("");
setPreco("");

carregarCompras(empresaId);
}

// ================= EDITAR
function editarCompra(c){

setEditandoId(c.id);
setFornecedor(c.fornecedor);
setProdutoId(c.produto_id);
setKilos(c.kilos);
setPreco(c.preco_compra);
setDataCompra(c.data_compra);
}

// ================= EXCLUIR
async function excluirCompra(id) {

if (!window.confirm("Excluir compra?")) return;

await supabase
.from("compras")
.delete()
.eq("id", id);

carregarCompras(empresaId);
}

// ================= PREVIEW
const comissaoPreview = calcularComissao();

// ================= TELA
return (

<div style={{ padding:20 }}>

<h1>📦 Compras</h1>

<input
type="date"
value={dataCompra}
onChange={(e)=>setDataCompra(e.target.value)}
/>

<br/><br/>

<input
placeholder="Fornecedor"
value={fornecedor}
onChange={(e)=>setFornecedor(e.target.value)}
/>

<br/><br/>

<select
value={produtoId}
onChange={(e)=>setProdutoId(e.target.value)}
>
<option value="">Selecione o produto</option>
{produtos.map(p => (
<option key={p.id} value={p.id}>
{p.nome}
</option>
))}
</select>

<br/><br/>

<input
type="number"
placeholder="Kilos"
value={kilos}
onChange={(e)=>setKilos(e.target.value)}
/>

<br/><br/>

<input
type="number"
placeholder="Preço por Kg"
value={preco}
onChange={(e)=>setPreco(e.target.value)}
/>

<br/><br/>

<p>💵 Comissão: R$ {comissaoPreview.toFixed(2)}</p>

<button onClick={salvarCompra}>
{editandoId ? "Atualizar Compra" : "Salvar Compra"}
</button>

<hr/>

<h3>🔍 Buscar fornecedor</h3>

<input
placeholder="Digite o nome"
value={busca}
onChange={(e)=>setBusca(e.target.value)}
/>

<hr/>

{comprasFiltradas.map((c) => (

<div key={c.id} style={{
marginBottom:10,
padding:10,
border:"1px solid #ccc"
}}>

<strong>{c.produtos?.nome}</strong> — {c.fornecedor}

<br/>

📅 {c.data_compra}

<br/>

⚖️ {c.kilos} kg | R$ {Number(c.preco_compra).toFixed(2)}

<br/>

💸 Comissão: R$ {Number(c.comissao || 0).toFixed(2)}

<br/><br/>

<button onClick={()=>editarCompra(c)}>✏️ Editar</button>

<button
onClick={()=>excluirCompra(c.id)}
style={{marginLeft:10,background:"red",color:"#fff"}}
>
🗑️ Excluir
</button>

</div>

))}

</div>

);
}