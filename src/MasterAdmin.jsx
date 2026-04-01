import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MasterAdmin(){

const [clientes,setClientes]=useState([]);

// FORM CLIENTE
const [tipo,setTipo]=useState("Empresa");
const [nome,setNome]=useState("");
const [email,setEmail]=useState("");
const [cpf,setCpf]=useState("");
const [whatsapp,setWhatsapp]=useState("");
const [valor,setValor]=useState("");

const [plano,setPlano]=useState("Básico");
const [status,setStatus]=useState("Ativo");

const [editandoId,setEditandoId]=useState(null);

// 🔥 PIX GLOBAL
const [pixSistema,setPixSistema]=useState("");

// ================= INIT

useEffect(()=>{
carregarClientes();
buscarPix();
},[]);

// ================= CARREGAR CLIENTES

async function carregarClientes(){

const { data, error } = await supabase
.from("empresas")
.select("*")
.order("created_at",{ascending:false});

if(error){
console.log(error);
alert("Erro ao carregar clientes");
}

setClientes(data || []);

}

// ================= BUSCAR PIX GLOBAL

async function buscarPix(){

const { data } = await supabase
.from("configuracoes")
.select("*")
.eq("chave","pix_sistema")
.single();

if(data){
setPixSistema(data.valor);
}

}

// ================= SALVAR PIX GLOBAL

async function salvarPix(){

const { error } = await supabase
.from("configuracoes")
.upsert({
chave:"pix_sistema",
valor:pixSistema
});

if(error){
alert("Erro ao salvar PIX");
}else{
alert("PIX salvo com sucesso!");
}

}

// ================= CADASTRAR CLIENTE

async function cadastrarCliente(){

if(!nome){
alert("Preencha o nome");
return;
}

if(editandoId){

const { error } = await supabase
.from("empresas")
.update({
name:nome,
email,
cpf,
whatsapp,
valor:Number(valor)
})
.eq("id",editandoId);

if(error){
alert("Erro ao atualizar");
return;
}

setEditandoId(null);

}else{

const { error } = await supabase
.from("empresas")
.insert([{
name:nome,
email,
cpf,
whatsapp,
valor:Number(valor),
plano,
status,
tipo,
tipo_sistema:"financeiro",
pagou:false
}]);

if(error){
alert("Erro ao cadastrar");
return;
}

}

limpar();
carregarClientes();

}

// ================= LIMPAR

function limpar(){
setNome("");
setEmail("");
setCpf("");
setWhatsapp("");
setValor("");
}

// ================= EDITAR

function editarCliente(c){

setEditandoId(c.id);
setNome(c.name || "");
setEmail(c.email || "");
setCpf(c.cpf || "");
setWhatsapp(c.whatsapp || "");
setValor(c.valor || "");

window.scrollTo({top:0,behavior:"smooth"});

}

// ================= EXCLUIR

async function excluirCliente(id){

const { error } = await supabase
.from("empresas")
.delete()
.eq("id",id);

if(error){
alert("Erro ao excluir");
}else{
carregarClientes();
}

}

// ================= STATUS

async function alterarStatus(c){

const novo = c.status==="Ativo"?"Bloqueado":"Ativo";

const { error } = await supabase
.from("empresas")
.update({status:novo})
.eq("id",c.id);

if(error){
alert("Erro ao alterar status");
}else{
carregarClientes();
}

}

// ================= ISENÇÃO

async function alternarIsencao(c){

const { error } = await supabase
.from("empresas")
.update({isento:!c.isento})
.eq("id",c.id);

if(error){
alert("Erro na isenção");
}else{
carregarClientes();
}

}

// ================= PAGO

async function marcarPago(c){

const mes = new Date().getMonth()+1;

const { error } = await supabase
.from("empresas")
.update({
pagou:true,
mes_pagamento:mes
})
.eq("id",c.id);

if(error){
alert("Erro ao marcar pago");
}else{
carregarClientes();
}

}

// ================= PENDENTE

async function marcarPendente(c){

const { error } = await supabase
.from("empresas")
.update({pagou:false})
.eq("id",c.id);

if(error){
alert("Erro ao marcar pendente");
}else{
carregarClientes();
}

}

// ================= PIX + WHATSAPP

function enviarPixWhatsApp(cliente){

if(!pixSistema){
alert("Cadastre seu PIX no topo");
return;
}

if(!cliente.whatsapp){
alert("Cliente sem WhatsApp");
return;
}

const numero = cliente.whatsapp.replace(/\D/g, "");

const mensagem = `Olá ${cliente.name || ""}!

Valor do aluguel: R$ ${cliente.valor || 0}

Segue o PIX para pagamento:
${pixSistema}

Após pagar, me envie o comprovante 👍`;

const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

window.open(url, "_blank");

}

// ================= UI

return(

<div style={{padding:20,color:"#fff"}}>

<h2 style={{marginBottom:20}}>👑 Painel Master Admin</h2>

{/* PIX */}
<div style={{background:"#111827",padding:15,borderRadius:10,marginBottom:20}}>

<h3>💰 PIX do Sistema</h3>

<input
placeholder="Seu PIX"
value={pixSistema}
onChange={e=>setPixSistema(e.target.value)}
style={{width:"100%",marginBottom:10}}
/>

<button onClick={salvarPix} style={btnPrincipal}>
Salvar PIX
</button>

</div>

{/* FORM */}
<div style={{
background:"#111827",
padding:15,
borderRadius:10,
marginBottom:20,
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:10
}}>

<input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)}/>
<input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
<input placeholder="CPF" value={cpf} onChange={e=>setCpf(e.target.value)}/>
<input placeholder="WhatsApp" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}/>
<input placeholder="Valor do aluguel" value={valor} onChange={e=>setValor(e.target.value)}/>

<button onClick={cadastrarCliente} style={btnPrincipal}>
{editandoId ? "Salvar" : "Cadastrar"}
</button>

</div>

{/* TABELA */}
<table style={{width:"100%",background:"#111827",borderRadius:10}}>

<thead>
<tr>
<th>Nome</th>
<th>Valor</th>
<th>Status</th>
<th>Pagamento</th>
<th>Ações</th>
</tr>
</thead>

<tbody>

{clientes.map(c=>(

<tr key={c.id} style={{textAlign:"center"}}>

<td>{c.name}</td>
<td>R$ {c.valor || 0}</td>

<td style={{color:c.status==="Ativo"?"#22c55e":"#ef4444"}}>
{c.status}
</td>

<td style={{color:c.pagou?"#22c55e":"#ef4444"}}>
{c.pagou ? "Pago" : "Pendente"}
</td>

<td style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>

<button style={btn} onClick={()=>editarCliente(c)}>Editar</button>
<button style={btn} onClick={()=>enviarPixWhatsApp(c)}>PIX</button>
<button style={btn} onClick={()=>marcarPago(c)}>Pago</button>
<button style={btn} onClick={()=>marcarPendente(c)}>Pendente</button>
<button style={btn} onClick={()=>alterarStatus(c)}>
{c.status==="Ativo"?"Bloquear":"Ativar"}
</button>
<button style={btn} onClick={()=>alternarIsencao(c)}>Isenção</button>
<button style={btnDanger} onClick={()=>excluirCliente(c.id)}>Excluir</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

);

}

// ESTILOS
const btn = {
padding:"6px 10px",
border:"none",
borderRadius:6,
background:"#374151",
color:"#fff",
cursor:"pointer"
};

const btnPrincipal = {
padding:"10px",
border:"none",
borderRadius:6,
background:"#22c55e",
color:"#fff",
cursor:"pointer"
};

const btnDanger = {
padding:"6px 10px",
border:"none",
borderRadius:6,
background:"#ef4444",
color:"#fff",
cursor:"pointer"
};