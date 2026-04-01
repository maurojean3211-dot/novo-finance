import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MasterAdmin(){

const [clientes,setClientes]=useState([]);

const [tipo,setTipo]=useState("Empresa");
const [nome,setNome]=useState("");
const [email,setEmail]=useState("");
const [cpf,setCpf]=useState("");
const [whatsapp,setWhatsapp]=useState("");
const [pix,setPix]=useState("");

const [plano,setPlano]=useState("Básico");
const [status,setStatus]=useState("Ativo");

const [editandoId,setEditandoId]=useState(null);

useEffect(()=>{
carregarClientes();
},[]);

// ================= CARREGAR

async function carregarClientes(){

const { data } = await supabase
.from("empresas")
.select("*")
.order("created_at",{ascending:false});

setClientes(data || []);

}

// ================= CADASTRAR

async function cadastrarCliente(){

if(!nome){
alert("Preencha o nome");
return;
}

if(editandoId){

await supabase
.from("empresas")
.update({
name:nome,
email,
cpf,
whatsapp,
pix
})
.eq("id",editandoId);

setEditandoId(null);

}else{

await supabase
.from("empresas")
.insert([{
name:nome,
email,
cpf,
whatsapp,
pix,
plano,
status,
tipo,
tipo_sistema:"financeiro",
pagou:false
}]);

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
setPix("");
}

// ================= EDITAR

function editarCliente(c){

setEditandoId(c.id);
setNome(c.name || "");
setEmail(c.email || "");
setCpf(c.cpf || "");
setWhatsapp(c.whatsapp || "");
setPix(c.pix || "");

window.scrollTo({top:0,behavior:"smooth"});

}

// ================= EXCLUIR

async function excluirCliente(id){

await supabase.from("empresas").delete().eq("id",id);
carregarClientes();

}

// ================= STATUS

async function alterarStatus(c){

const novo = c.status==="Ativo"?"Bloqueado":"Ativo";

await supabase
.from("empresas")
.update({status:novo})
.eq("id",c.id);

carregarClientes();

}

// ================= ISENÇÃO

async function alternarIsencao(c){

await supabase
.from("empresas")
.update({isento:!c.isento})
.eq("id",c.id);

carregarClientes();

}

// ================= PAGO

async function marcarPago(c){

const mes = new Date().getMonth()+1;

await supabase
.from("empresas")
.update({
pagou:true,
mes_pagamento:mes
})
.eq("id",c.id);

carregarClientes();

}

// ================= PENDENTE

async function marcarPendente(c){

await supabase
.from("empresas")
.update({pagou:false})
.eq("id",c.id);

carregarClientes();

}

// ================= PIX

function copiarPix(chave){

if(!chave){
alert("Cliente sem PIX");
return;
}

navigator.clipboard.writeText(chave);
alert("PIX copiado!");

}

return(

<div style={{padding:20,color:"#fff"}}>

<h2 style={{marginBottom:20}}>👑 Painel Master Admin</h2>

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
<input placeholder="PIX (CPF/email/telefone)" value={pix} onChange={e=>setPix(e.target.value)}/>

<button onClick={cadastrarCliente} style={btnPrincipal}>
{editandoId ? "Salvar" : "Cadastrar"}
</button>

</div>

{/* TABELA */}
<table style={{width:"100%",background:"#111827",borderRadius:10}}>

<thead>
<tr>
<th>Nome</th>
<th>Plano</th>
<th>Status</th>
<th>Pagamento</th>
<th>PIX</th>
<th>Ações</th>
</tr>
</thead>

<tbody>

{clientes.map(c=>(

<tr key={c.id} style={{textAlign:"center"}}>

<td>{c.name}</td>
<td>{c.plano}</td>

<td style={{color:c.status==="Ativo"?"#22c55e":"#ef4444"}}>
{c.status}
</td>

<td style={{color:c.pagou?"#22c55e":"#ef4444"}}>
{c.pagou ? "Pago" : "Pendente"}
</td>

<td>{c.pix || "-"}</td>

<td style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>

<button style={btn} onClick={()=>editarCliente(c)}>Editar</button>

<button style={btn} onClick={()=>copiarPix(c.pix)}>PIX</button>

<button style={btn} onClick={()=>marcarPago(c)}>Pago</button>

<button style={btn} onClick={()=>marcarPendente(c)}>Pendente</button>

<button style={btn} onClick={()=>alterarStatus(c)}>
{c.status==="Ativo"?"Bloquear":"Ativar"}
</button>

<button style={btn} onClick={()=>alternarIsencao(c)}>
Isenção
</button>

<button style={btnDanger} onClick={()=>excluirCliente(c.id)}>
Excluir
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

);

}

// ===== ESTILOS

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