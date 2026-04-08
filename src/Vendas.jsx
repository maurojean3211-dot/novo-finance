import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Vendas(){

const [clientes,setClientes] = useState([]);
const [vendas,setVendas] = useState([]);

const [clienteId,setClienteId] = useState("");
const [clienteNome,setClienteNome] = useState("");

const [quantidade,setQuantidade] = useState("");

const [dataVenda,setDataVenda] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);
const [userEmail,setUserEmail] = useState(null);

const [editandoId,setEditandoId] = useState(null);

// 🔍 BUSCA
const [buscaCliente,setBuscaCliente] = useState("");

// ================= INIT
useEffect(()=>{
buscarEmpresa();
},[]);

// ================= EMPRESA
async function buscarEmpresa(){

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

const { data:vendasData } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empresa_id)
.order("data_venda",{ascending:false});

setClientes(clientesData || []);
setVendas(vendasData || []);
}

// ================= CALCULOS
const qtd = parseFloat(quantidade) || 0;
const comissao = qtd * 0.05;

const totalComissao = vendas.reduce((acc,v)=>{
return acc + Number(v.comissao || 0);
},0);

// ================= FILTRO
const vendasFiltradas = vendas.filter(v=>{
const cliente = clientes.find(c=>c.id === v.cliente_id);
return cliente?.nome?.toLowerCase().includes(buscaCliente.toLowerCase());
});

// ================= EDITAR
function iniciarEdicao(v){

setEditandoId(v.id);
setQuantidade(v.kilos || "");
setDataVenda(v.data_venda || "");

const cliente = clientes.find(c=>c.id === v.cliente_id);
if(cliente){
setClienteNome(cliente.nome);
setClienteId(cliente.id);
}

}

// ================= EXCLUIR
async function excluirVenda(id){

const confirma = confirm("Deseja excluir?");
if(!confirma) return;

await supabase.from("recebimentos").delete().eq("venda_id",id);

const { error } = await supabase
.from("vendas")
.delete()
.eq("id",id);

if(error){
alert("Erro ao excluir: " + error.message);
return;
}

alert("Excluído!");
buscarDados(empresaId);
}

// ================= SALVAR
async function salvarVenda(){

if(!empresaId) return alert("Empresa não carregada");
if(!clienteNome) return alert("Informe o cliente");
if(qtd <= 0) return alert("Quantidade inválida");

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return alert("Usuário não autenticado");

// cliente
let clienteFinalId = clienteId;

if(!clienteId){

const { data:novoCliente } = await supabase
.from("clientes")
.insert([{
nome: clienteNome,
empresa_id: empresaId
}])
.select()
.single();

clienteFinalId = novoCliente?.id;
}

// EDITAR OU NOVO
if(editandoId){

await supabase
.from("vendas")
.update({
cliente_id: clienteFinalId,
kilos:Number(qtd),
comissao:Number(comissao),
data_venda:dataVenda
})
.eq("id",editandoId);

alert("Venda atualizada!");
setEditandoId(null);

}else{

await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_id:clienteFinalId,
kilos:Number(qtd),
comissao:Number(comissao),
data_venda:dataVenda,
user_id:user.id
}]);

alert("Venda salva!");
}

// limpar
setQuantidade("");
setClienteNome("");
setClienteId("");

buscarDados(empresaId);
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
type="number"
placeholder="Peso (KG)"
value={quantidade}
onChange={e=>setQuantidade(e.target.value)}
/>

<br/><br/>

<div>
<strong>Comissão:</strong> R$ {comissao.toFixed(2)}
</div>

<br/>

<button onClick={salvarVenda}>
{editandoId ? "Atualizar" : "Salvar"}
</button>

<hr/>

<h3>📊 Total Comissão: R$ {totalComissao.toFixed(2)}</h3>

<hr/>

<h3>🔍 Buscar Cliente</h3>

<input
placeholder="Digite o nome"
value={buscaCliente}
onChange={e=>setBuscaCliente(e.target.value)}
/>

<hr/>

{vendasFiltradas.map(v=>{

const cliente = clientes.find(c=>c.id === v.cliente_id);

return(

<div key={v.id} style={{
marginBottom:10,
padding:10,
border:"1px solid #ccc"
}}>

📅 {new Date(v.data_venda).toLocaleDateString("pt-BR")} <br/>
👤 {cliente?.nome} <br/>
⚖️ {v.kilos} kg <br/>
💸 R$ {Number(v.comissao).toFixed(2)}

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

)

})}

</div>

);

}