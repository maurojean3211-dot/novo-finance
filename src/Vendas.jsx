import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Vendas(){

const [clientes,setClientes] = useState([]);
const [produtos,setProdutos] = useState([]);
const [vendas,setVendas] = useState([]);

const [clienteId,setClienteId] = useState("");
const [clienteNome,setClienteNome] = useState("");

const [produtoId,setProdutoId] = useState("");

const [quantidade,setQuantidade] = useState("");
const [precoUnitario,setPrecoUnitario] = useState("");

const [parcelas,setParcelas] = useState(1);

const [dataVenda,setDataVenda] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);
const [userEmail,setUserEmail] = useState(null);

// 🔥 NOVO (EDIÇÃO)
const [editandoId,setEditandoId] = useState(null);

// ================= INIT
useEffect(()=>{
buscarEmpresa();
},[]);

// ================= EMPRESA
async function buscarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return;

setUserEmail(user.email);

const { data,error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(!data?.empresa_id) return;

setEmpresaId(data.empresa_id);
buscarDados(data.empresa_id);
}

// 🔒 BLOQUEIO
if(userEmail && userEmail !== "maurojean3211@gmail.com"){
return <div style={{padding:20,color:"#fff"}}>⛔ Acesso restrito</div>;
}

// ================= DADOS
async function buscarDados(empresa_id){

const { data:clientesData } = await supabase
.from("clientes")
.select("*")
.eq("empresa_id",empresa_id)
.order("nome");

const { data:produtosData } = await supabase
.from("produtos")
.select("*")
.eq("empresa_id",empresa_id);

const { data:vendasData } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empresa_id)
.order("data_venda",{ascending:false});

setClientes(clientesData || []);
setProdutos(produtosData || []);
setVendas(vendasData || []);
}

// ================= CALCULOS
const qtd = parseFloat(quantidade) || 0;
const preco = parseFloat(precoUnitario) || 0;

const valorTotal = preco * qtd;
const comissao = qtd * 0.05;

const totalComissao = vendas.reduce((acc,v)=>{
return acc + Number(v.comissao || 0);
},0);

// ================= EDITAR
function iniciarEdicao(v){

setEditandoId(v.id);

setClienteId(v.cliente_id || "");
setProdutoId(v.produto || "");
setQuantidade(v.kilos || "");
setPrecoUnitario(v.preco_unitario || "");
setDataVenda(v.data_venda || "");

}

// ================= EXCLUIR
async function excluirVenda(id){

const confirma = confirm("Deseja excluir esta venda?");
if(!confirma) return;

// excluir recebimentos
await supabase.from("recebimentos")
.delete()
.eq("venda_id",id);

// excluir venda
const { error } = await supabase
.from("vendas")
.delete()
.eq("id",id);

if(error){
alert("Erro ao excluir: " + error.message);
return;
}

alert("Venda excluída!");
buscarDados(empresaId);
}

// ================= SALVAR
async function salvarVenda(){

try{

if(!empresaId) return alert("Empresa não carregada");
if(!clienteNome) return alert("Informe o cliente");
if(qtd <= 0) return alert("Quantidade inválida");

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return alert("Usuário não autenticado");

// criar cliente se não existir
let clienteFinalId = clienteId;

if(!clienteId){

const { data:novoCliente, error:erroCliente } = await supabase
.from("clientes")
.insert([{
nome: clienteNome,
empresa_id: empresaId
}])
.select()
.single();

if(erroCliente){
alert("Erro cliente: " + erroCliente.message);
return;
}

clienteFinalId = novoCliente?.id;
}

// 🔥 EDITAR OU INSERT
if(editandoId){

const { error } = await supabase
.from("vendas")
.update({
cliente_id: clienteFinalId,
produto: produtoId || null,
kilos:Number(qtd),
preco_unitario:Number(preco),
valor_total:Number(valorTotal),
comissao:Number(comissao),
data_venda:dataVenda
})
.eq("id",editandoId);

if(error){
alert("Erro ao atualizar: " + error.message);
return;
}

alert("Venda atualizada!");
setEditandoId(null);

}else{

const { data:venda, error } = await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_id:clienteFinalId,
produto: produtoId || null,
kilos:Number(qtd),
preco_unitario:Number(preco),
valor_total:Number(valorTotal),
comissao:Number(comissao),
data_venda:dataVenda,
user_id:user.id
}])
.select()
.single();

if(error){
alert("Erro ao salvar venda:\n" + error.message);
return;
}

// recebimentos
let listaRecebimentos = [];

for(let i=1;i<=parcelas;i++){

let dataParcela = new Date(dataVenda);
dataParcela.setDate(dataParcela.getDate() + ((i-1)*30));

listaRecebimentos.push({
empresa_id: empresaId,
venda_id: venda.id,
cliente_id: clienteFinalId,
valor: Number((valorTotal / parcelas).toFixed(2)),
data_vencimento: dataParcela.toISOString().split("T")[0],
status: "pendente"
});
}

await supabase.from("recebimentos").insert(listaRecebimentos);

alert("Venda salva com sucesso!");
}

// limpar
setQuantidade("");
setPrecoUnitario("");
setParcelas(1);
setClienteNome("");
setClienteId("");
setProdutoId("");

buscarDados(empresaId);

}catch(err){
alert("Erro: " + err.message);
}

}

// ================= TELA
return(

<div style={{padding:20}}>

<h1>🛒 {editandoId ? "Editar Venda" : "Registrar Venda"}</h1>

<input
type="date"
value={dataVenda}
onChange={e=>setDataVenda(e.target.value)}
/>

<br/><br/>

<input
list="lista-clientes"
placeholder="Cliente"
value={clienteNome}
onChange={e=>{
setClienteNome(e.target.value);

const cliente = clientes.find(c=>c.nome === e.target.value);

if(cliente){
setClienteId(cliente.id);
}else{
setClienteId("");
}
}}
/>

<datalist id="lista-clientes">
{clientes.map(c=>(
<option key={c.id} value={c.nome} />
))}
</datalist>

<br/><br/>

<input
list="lista-produtos"
placeholder="Produto"
value={produtoId}
onChange={e=>setProdutoId(e.target.value)}
/>

<datalist id="lista-produtos">
{produtos.map(p=>(
<option key={p.id} value={p.nome} />
))}
</datalist>

<br/><br/>

<input
type="number"
placeholder="Peso (KG)"
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

<input
type="number"
value={parcelas}
onChange={e=>setParcelas(Number(e.target.value))}
min="1"
/>

<br/><br/>

<div>
<strong>Total:</strong> R$ {valorTotal.toFixed(2)} <br/>
<strong>Comissão:</strong> R$ {comissao.toFixed(2)}
</div>

<br/>

<button onClick={salvarVenda}>
{editandoId ? "Atualizar Venda" : "Salvar Venda"}
</button>

<hr/>

<h3>📊 Total de Comissão: R$ {totalComissao.toFixed(2)}</h3>

<hr/>

{vendas.map(v=>(

<div key={v.id} style={{
marginBottom:10,
padding:10,
border:"1px solid #ccc",
borderRadius:5
}}>

📅 {new Date(v.data_venda).toLocaleDateString("pt-BR")} <br/>
💰 R$ {Number(v.valor_total).toFixed(2)} <br/>
⚖️ {v.kilos} kg <br/>
💸 Comissão: R$ {Number(v.comissao || 0).toFixed(2)}

<br/><br/>

<button onClick={()=>iniciarEdicao(v)}>
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