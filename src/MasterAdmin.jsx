import { useEffect, useState } from "react";
import { supabase } from "./supabase";

import {
LineChart,
Line,
XAxis,
YAxis,
CartesianGrid,
Tooltip,
BarChart,
Bar,
PieChart,
Pie,
Cell,
Legend
} from "recharts";

export default function MasterAdmin(){

const [clientes,setClientes]=useState([]);

const [tipo,setTipo]=useState("Empresa");
const [nome,setNome]=useState("");
const [email,setEmail]=useState("");
const [cpf,setCpf]=useState("");
const [whatsapp,setWhatsapp]=useState("");

const [plano,setPlano]=useState("Básico");
const [status,setStatus]=useState("Ativo");

const [editandoId,setEditandoId]=useState(null);

const [ativos,setAtivos]=useState(0);
const [bloqueados,setBloqueados]=useState(0);
const [faturamento,setFaturamento]=useState(0);

const [dadosDiarios,setDadosDiarios]=useState([]);
const [dadosMensais,setDadosMensais]=useState([]);

const [pixQr,setPixQr]=useState("");
const [pixCode,setPixCode]=useState("");

useEffect(()=>{
carregarClientes();
},[]);

// ================= GERAR PIX

async function gerarPix(cliente){

let valor=49;

if(cliente.plano==="Premium") valor=99;
if(cliente.plano==="Enterprise") valor=199;

const response = await fetch("/api/pix",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
nome:cliente.name,
email:cliente.email,
valor:valor,
descricao:"Mensalidade Cunha Finance"
})
});

const data = await response.json();

if(data){
setPixQr(data.encodedImage || data.qrCode || "");
setPixCode(data.payload || data.copyPaste || "");
}else{
alert("Erro ao gerar PIX");
}

}

// ================= CARREGAR CLIENTES

async function carregarClientes(){

const { data, error } = await supabase
.from("empresas")
.select("*")
.order("created_at",{ascending:false});

if(error){
console.log(error);
return;
}

const lista = data || [];
setClientes(lista);

let ativosCount=0;
let bloqueadosCount=0;
let faturamentoTotal=0;

const dias={};
const meses={};

lista.forEach(c=>{

const statusCliente = c.status || "Ativo";

if(statusCliente==="Ativo") ativosCount++;
if(statusCliente==="Bloqueado") bloqueadosCount++;

if(!c.isento){

if(c.plano==="Básico") faturamentoTotal+=49;
if(c.plano==="Premium") faturamentoTotal+=99;
if(c.plano==="Enterprise") faturamentoTotal+=199;

}

if(c.created_at){

const dataCriacao = new Date(c.created_at);

const dia = dataCriacao.toISOString().split("T")[0];
const mes = dataCriacao.getMonth()+1;

if(!dias[dia]) dias[dia]=0;
if(!meses[mes]) meses[mes]=0;

dias[dia]++;
meses[mes]++;

}

});

setAtivos(ativosCount);
setBloqueados(bloqueadosCount);
setFaturamento(faturamentoTotal);

const nomesMes=[
"Jan","Fev","Mar","Abr","Mai","Jun",
"Jul","Ago","Set","Out","Nov","Dez"
];

setDadosDiarios(
Object.keys(dias).map(d=>({
dia:d,
clientes:dias[d]
}))
);

setDadosMensais(
Object.keys(meses).map(m=>({
mes:nomesMes[m-1],
clientes:meses[m]
}))
);

}

// ================= CADASTRAR CLIENTE

async function cadastrarCliente(){

if(!nome){
alert("Preencha o nome da empresa");
return;
}

if(editandoId){

await supabase
.from("empresas")
.update({
name:nome,
email:email,
cpf:cpf,
whatsapp:whatsapp
})
.eq("id",editandoId);

setEditandoId(null);

}else{

await supabase
.from("empresas")
.insert([
{
name:nome,
email:email,
cpf:cpf,
whatsapp:whatsapp,
plano:plano,
status:status,
tipo:tipo,
tipo_sistema:"financeiro"
}
]);

}

setNome("");
setEmail("");
setCpf("");
setWhatsapp("");

carregarClientes();

}

// ================= EDITAR

function editarCliente(c){

setEditandoId(c.id);

setNome(c.name || "");
setEmail(c.email || "");
setCpf(c.cpf || "");
setWhatsapp(c.whatsapp || "");

window.scrollTo({ top:0, behavior:"smooth" });

}

// ================= EXCLUIR

async function excluirCliente(id){

await supabase
.from("empresas")
.delete()
.eq("id",id);

carregarClientes();

}

// ================= STATUS

async function alterarStatus(cliente){

const novoStatus = cliente.status==="Ativo"?"Bloqueado":"Ativo";

await supabase
.from("empresas")
.update({status:novoStatus})
.eq("id",cliente.id);

carregarClientes();

}

// ================= ISENÇÃO

async function alternarIsencao(cliente){

await supabase
.from("empresas")
.update({isento:!cliente.isento})
.eq("id",cliente.id);

carregarClientes();

}

return(

<div style={{padding:30,color:"#fff"}}>

<h1>👑 Painel de Clientes do Sistema</h1>

{pixCode && (

<div style={{
background:"#111827",
padding:20,
borderRadius:10,
marginBottom:30
}}>

<h3>💰 PIX Mensalidade</h3>

{pixQr && <img src={pixQr} width={200}/>}

<textarea
value={pixCode}
readOnly
style={{width:"100%",height:80,marginTop:10}}
/>

<button
onClick={()=>navigator.clipboard.writeText(pixCode)}
style={{
marginTop:10,
padding:10,
background:"#22c55e",
border:"none",
borderRadius:6,
color:"#fff"
}}
>
Copiar PIX
</button>

</div>

)}

<div style={{
background:"#111827",
padding:20,
borderRadius:10,
marginBottom:30,
display:"flex",
gap:10,
flexWrap:"wrap"
}}>

<input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} />
<input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
<input placeholder="CPF" value={cpf} onChange={e=>setCpf(e.target.value)} />
<input placeholder="WhatsApp" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} />

<button onClick={cadastrarCliente}>
{editandoId ? "Salvar Alteração" : "Cadastrar Cliente"}
</button>

</div>

<table style={{width:"100%",background:"#111827"}}>

<thead>
<tr>
<th>Tipo</th>
<th>Nome</th>
<th>Email</th>
<th>CPF</th>
<th>WhatsApp</th>
<th>Plano</th>
<th>Status</th>
<th>Isento</th>
<th>Ações</th>
</tr>
</thead>

<tbody>

{clientes.map(c=>(

<tr key={c.id}>

<td>{c.tipo}</td>
<td>{c.name}</td>
<td>{c.email}</td>
<td>{c.cpf}</td>
<td>{c.whatsapp}</td>
<td>{c.plano}</td>
<td>{c.status}</td>
<td>{c.isento ? "Sim":"Não"}</td>

<td>

<button onClick={()=>editarCliente(c)}>Editar</button>
<button onClick={()=>gerarPix(c)}>PIX</button>

<button onClick={()=>alterarStatus(c)}>
{c.status==="Ativo"?"Bloquear":"Ativar"}
</button>

<button onClick={()=>alternarIsencao(c)}>
{c.isento?"Remover Isenção":"Isentar"}
</button>

<button onClick={()=>excluirCliente(c.id)}>
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