import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MasterAdmin(){

const [clientes,setClientes]=useState([]);
const [usuario,setUsuario]=useState(null);

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

// PIX GLOBAL
const [pixSistema,setPixSistema]=useState("");

// INIT
useEffect(()=>{
verificarUsuario();
},[]);

// 🔐 VERIFICA MASTER
async function verificarUsuario(){

const { data: userData } = await supabase.auth.getUser();

if(!userData?.user){
alert("Usuário não logado");
return;
}

const emailUser = userData.user.email;

const { data, error } = await supabase
.from("usuarios")
.select("*")
.eq("email", emailUser)
.single();

if(error || !data){
console.log(error);
alert("Usuário não encontrado");
return;
}

if(data.role !== "master"){
alert("Acesso negado - somente master");
return;
}

setUsuario(data);

carregarClientes();
buscarPix();
}

// CARREGAR
async function carregarClientes(){

const { data, error } = await supabase
.from("empresas")
.select("*")
.order("created_at",{ascending:false});

if(error){
console.log("ERRO CARREGAR:", error);
alert(error.message);
}

setClientes(data || []);
}

// BUSCAR PIX
async function buscarPix(){

const { data, error } = await supabase
.from("configuracoes")
.select("*")
.eq("chave","pix_sistema")
.single();

if(error){
console.log(error);
return;
}

if(data){
setPixSistema(data.valor);
}
}

// SALVAR PIX
async function salvarPix(){

const { error } = await supabase
.from("configuracoes")
.upsert({
chave:"pix_sistema",
valor:pixSistema
});

if(error){
console.log(error);
alert(error.message);
}else{
alert("PIX salvo com sucesso!");
}
}

// CADASTRAR / EDITAR
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
.eq("id",editandoId)
.select();

if(error){
console.log(error);
alert(error.message);
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
pagou:false,
isento:false
}])
.select();

if(error){
console.log(error);
alert(error.message);
return;
}

}

limpar();
carregarClientes();
}

// LIMPAR
function limpar(){
setNome("");
setEmail("");
setCpf("");
setWhatsapp("");
setValor("");
}

// EDITAR
function editarCliente(c){
setEditandoId(c.id);
setNome(c.name || "");
setEmail(c.email || "");
setCpf(c.cpf || "");
setWhatsapp(c.whatsapp || "");
setValor(c.valor || "");
window.scrollTo({top:0,behavior:"smooth"});
}

// EXCLUIR
async function excluirCliente(id){

const { error } = await supabase
.from("empresas")
.delete()
.eq("id",id)
.select();

if(error){
console.log(error);
alert(error.message);
}else{
carregarClientes();
}
}

// STATUS
async function alterarStatus(c){

const novo = c.status==="Ativo"?"Bloqueado":"Ativo";

const { error } = await supabase
.from("empresas")
.update({status:novo})
.eq("id",c.id)
.select();

if(error){
console.log(error);
alert(error.message);
}else{
carregarClientes();
}
}

// ISENÇÃO
async function alternarIsencao(c){

const { error } = await supabase
.from("empresas")
.update({isento:!c.isento})
.eq("id",c.id)
.select();

if(error){
console.log(error);
alert(error.message);
}else{
carregarClientes();
}
}

// PAGO
async function marcarPago(c){

const mes = new Date().getMonth()+1;

const { error } = await supabase
.from("empresas")
.update({
pagou:true,
mes_pagamento:mes
})
.eq("id",c.id)
.select();

if(error){
console.log(error);
alert(error.message);
}else{
carregarClientes();
}
}

// PENDENTE
async function marcarPendente(c){

const { error } = await supabase
.from("empresas")
.update({pagou:false})
.eq("id",c.id)
.select();

if(error){
console.log(error);
alert(error.message);
}else{
carregarClientes();
}
}

// PIX WHATSAPP
function enviarPixWhatsApp(cliente){

if(!pixSistema){
alert("Cadastre seu PIX");
return;
}

if(!cliente.whatsapp){
alert("Cliente sem WhatsApp");
return;
}

const numero = cliente.whatsapp.replace(/\D/g, "");

const mensagem = `Olá ${cliente.name || ""}!

Valor: ${cliente.isento ? "ISENTO" : `R$ ${cliente.valor || 0}`}

PIX:
${pixSistema}`;

const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

window.open(url, "_blank");
}

// BLOQUEIA RENDER
if(!usuario){
return <div style={{color:"#fff",padding:20}}>🔒 Verificando acesso...</div>;
}

// UI
return(

<div style={{padding:20,color:"#fff"}}>

<h2>👑 Painel Master Admin</h2>

<input
placeholder="PIX"
value={pixSistema}
onChange={e=>setPixSistema(e.target.value)}
/>
<button onClick={salvarPix}>Salvar PIX</button>

<br/><br/>

<input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)}/>
<input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
<input placeholder="CPF" value={cpf} onChange={e=>setCpf(e.target.value)}/>
<input placeholder="WhatsApp" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}/>
<input placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)}/>

<button onClick={cadastrarCliente}>
{editandoId ? "Salvar" : "Cadastrar"}
</button>

<table>
<tbody>

{clientes.map(c=>(

<tr key={c.id}>
<td>{c.name}</td>
<td>{c.valor}</td>

<td>
<button onClick={()=>editarCliente(c)}>Editar</button>
<button onClick={()=>marcarPago(c)}>Pago</button>
<button onClick={()=>marcarPendente(c)}>Pendente</button>
<button onClick={()=>alterarStatus(c)}>Status</button>
<button onClick={()=>alternarIsencao(c)}>Isentar</button>
<button onClick={()=>excluirCliente(c.id)}>Excluir</button>
</td>

</tr>

))}

</tbody>
</table>

</div>
);
}