import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Compras() {

const [role, setRole] = useState("cliente");
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

useEffect(() => {
iniciar();
}, []);

async function iniciar() {
await carregarEmpresa();
}


// ================= EMPRESA
async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

const { data, error } = await supabase
.from("usuarios")
.select("empresa_id, role")
.eq("id",user.id)
.single();

if(error){
console.log("Erro empresa:",error);
return;
}

if(data){
setEmpresaId(data.empresa_id);
setRole(data.role || "cliente");

await carregarProdutos(data.empresa_id);
await carregarCompras(data.empresa_id);
}

}


// ================= PRODUTOS
async function carregarProdutos(empresa_id) {

if(!empresa_id) return;

const { data } = await supabase
.from("produtos")
.select("id,nome")
.eq("empresa_id",empresa_id)
.order("nome");

setProdutos(data || []);

}


// ================= COMPRAS
async function carregarCompras(empresa_id) {

if(!empresa_id) return;

const { data } = await supabase
.from("compras")
.select(`*,
produtos (
nome
)`)
.eq("empresa_id",empresa_id)
.order("id", { ascending:false });

setCompras(data || []);

}


// ================= SALVAR COMPRA
async function salvarCompra() {

if(!empresaId){
alert("Empresa não carregada");
return;
}

const { data: { user } } = await supabase.auth.getUser();
if (!user) return;


// validações
if (!produtoId) {
alert("Selecione um produto");
return;
}

if (!kilos) {
alert("Informe os kilos");
return;
}

if (!preco) {
alert("Informe o preço");
return;
}

const produto = produtos.find(p => p.id === produtoId);

const valorTotal = Number(kilos) * Number(preco);


// ================= SALVAR COMPRA
const { error } = await supabase
.from("compras")
.insert([
{
empresa_id:empresaId,
fornecedor: fornecedor,
produto_id: produtoId,
kilos: Number(kilos),
preco_compra: Number(preco),
valor_total: valorTotal,
data_compra: dataCompra,
user_id: user.id
}
]);

if (error) {
alert(error.message);
return;
}


// ================= REGISTRAR NO FINANCEIRO (CORRIGIDO 🔥)
await supabase
.from("lancamentos")
.insert([
{
empresa_id:empresaId,
tipo: "despesa",
categoria: "Compras",
descricao: `Compra ${produto?.nome || ""}`,
valor: valorTotal,
data_lancamento: new Date(dataCompra).toISOString(), // 🔥 ESSENCIAL
mes: new Date(dataCompra).getMonth() + 1,
ano: new Date(dataCompra).getFullYear()
}
]);


setFornecedor("");
setProdutoId("");
setKilos("");
setPreco("");

await carregarCompras(empresaId);

}


// ================= EXCLUIR COMPRA
async function excluirCompra(id) {

if (!window.confirm("Deseja excluir esta compra?")) return;

await supabase
.from("compras")
.delete()
.eq("id", id)
.eq("empresa_id",empresaId);

carregarCompras(empresaId);

}


const titulo =
role === "admin"
? "♻️ Compras / Sucata"
: "🛒 Compras";


return (

<div style={{ padding:20 }}>

<h1>{titulo}</h1>

<label>Data da Compra</label><br/>

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

<button onClick={salvarCompra}>
Salvar Compra
</button>

<hr/>

{compras.map((c) => (

<div
key={c.id}
style={{
marginBottom:10,
padding:10,
border:"1px solid #ccc",
borderRadius:6
}}
>

<strong>{c.produtos?.nome || "Produto"}</strong>
{" — "}
{c.fornecedor}

<br/>

📅 {c.data_compra || "-"}

<br/>

Kg: {c.kilos} | R$ {Number(c.preco_compra || 0).toFixed(2)}

<br/>

<button
onClick={()=>excluirCompra(c.id)}
style={{
marginTop:5,
background:"red",
color:"#fff",
border:"none",
padding:"5px 10px",
cursor:"pointer"
}}
>

Excluir

</button>

</div>

))}

</div>

);
}