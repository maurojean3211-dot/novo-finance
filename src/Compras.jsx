import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Compras() {

const [compras, setCompras] = useState([]);

const [fornecedor, setFornecedor] = useState("");
const [produto, setProduto] = useState(""); // 🔥 LIVRE
const [kilos, setKilos] = useState("");

const [dataCompra, setDataCompra] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);
const [userEmail,setUserEmail] = useState(null);

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
carregarCompras(data.empresa_id);
}

// 🔒 BLOQUEIO
if(userEmail && userEmail !== "maurojean3211@gmail.com"){
return <div style={{padding:20,color:"#fff"}}>⛔ Acesso restrito</div>;
}

// ================= COMPRAS
async function carregarCompras(empresa_id) {

const { data } = await supabase
.from("compras")
.select("*")
.eq("empresa_id",empresa_id)
.order("id",{ascending:false});

setCompras(data || []);
}

// ================= COMISSÃO
function calcularComissao(){

const nome = (produto || "").toUpperCase();
const kg = Number(kilos || 0);

if(nome.includes("LIMALHA") || nome.includes("CAVACO")){
return kg * 0.07;
}

return kg * 0.05;
}

// ================= FILTRO
const comprasFiltradas = compras.filter(c =>
(c.fornecedor || "").toLowerCase().includes(busca.toLowerCase())
);

// ================= SALVAR
async function salvarCompra(){

if(!empresaId) return alert("Empresa não carregada");

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

if(!produto) return alert("Informe o produto");
if(!kilos) return alert("Informe os kilos");

const comissao = calcularComissao();

if(editandoId){

await supabase
.from("compras")
.update({
fornecedor,
produto,
kilos:Number(kilos),
comissao,
data_compra:dataCompra
})
.eq("id",editandoId);

alert("Atualizado!");
setEditandoId(null);

}else{

await supabase
.from("compras")
.insert([{
empresa_id:empresaId,
fornecedor,
produto,
kilos:Number(kilos),
comissao,
data_compra:dataCompra,
user_id:user.id
}]);

alert("Salvo!");
}

// limpar
setFornecedor("");
setProduto("");
setKilos("");

carregarCompras(empresaId);
}

// ================= EDITAR
function editarCompra(c){

setEditandoId(c.id);
setFornecedor(c.fornecedor);
setProduto(c.produto);
setKilos(c.kilos);
setDataCompra(c.data_compra);

}

// ================= EXCLUIR
async function excluirCompra(id){

if(!confirm("Excluir?")) return;

await supabase.from("compras").delete().eq("id",id);

carregarCompras(empresaId);
}

// ================= PREVIEW
const comissaoPreview = calcularComissao();

// ================= TELA
return(

<div style={{padding:20}}>

<h1>📦 Compras</h1>

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
placeholder="Produto (ex: sucata ou limalha)"
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

<button onClick={salvarCompra}>
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

<div key={c.id} style={{border:"1px solid #ccc",padding:10,marginBottom:10}}>

📅 {c.data_compra} <br/>
👤 {c.fornecedor} <br/>
📦 {c.produto} <br/>
⚖️ {c.kilos} kg <br/>
💸 R$ {Number(c.comissao).toFixed(2)}

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