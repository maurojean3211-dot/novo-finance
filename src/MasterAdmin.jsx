import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MasterAdmin(){

const [clientes,setClientes]=useState([]);
const [usuario,setUsuario]=useState(null);

const [nome,setNome]=useState("");
const [email,setEmail]=useState("");
const [cpf,setCpf]=useState("");
const [whatsapp,setWhatsapp]=useState("");
const [valor,setValor]=useState("");

const [editandoId,setEditandoId]=useState(null);

// PIX
const [pixSistema,setPixSistema]=useState("");

// INIT
useEffect(()=>{
verificarUsuario();
},[]);

// ================= USUARIO
async function verificarUsuario(){

const { data: userData } = await supabase.auth.getUser();
if(!userData?.user) return;

const { data } = await supabase
.from("usuarios")
.select("*")
.eq("email", userData.user.email)
.single();

if(!data || data.role !== "master"){
alert("Acesso negado");
return;
}

setUsuario(data);

await carregarClientes();
await buscarPix();
}

// ================= CLIENTES
async function carregarClientes(){

const { data } = await supabase
.from("empresas")
.select("*")
.order("created_at",{ascending:false});

setClientes(data || []);
}

// ================= PIX
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

async function salvarPix(){

await supabase
.from("configuracoes")
.upsert({
chave:"pix_sistema",
valor:pixSistema
});

alert("PIX salvo!");
}

// ================= CADASTRO
async function cadastrarCliente(){

if(!nome) return alert("Nome obrigatório");

if(editandoId){

await supabase
.from("empresas")
.update({
name:nome,
email,
cpf,
whatsapp,
valor:Number(valor)
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
valor:Number(valor),
status:"Ativo",
pagou:false,
isento:false
}]);
}

limpar();
carregarClientes();
}

// ================= FUNCOES
function limpar(){
setNome(""); setEmail(""); setCpf(""); setWhatsapp(""); setValor("");
}

function editarCliente(c){
setEditandoId(c.id);
setNome(c.name || "");
setEmail(c.email || "");
setCpf(c.cpf || "");
setWhatsapp(c.whatsapp || "");
setValor(c.valor || "");
}

async function excluirCliente(id){
await supabase.from("empresas").delete().eq("id",id);
carregarClientes();
}

async function marcarPago(c){
await supabase.from("empresas").update({pagou:true}).eq("id",c.id);
carregarClientes();
}

async function marcarPendente(c){
await supabase.from("empresas").update({pagou:false}).eq("id",c.id);
carregarClientes();
}

async function alterarStatus(c){
const novo = c.status==="Ativo"?"Bloqueado":"Ativo";
await supabase.from("empresas").update({status:novo}).eq("id",c.id);
carregarClientes();
}

async function alternarIsencao(c){
await supabase.from("empresas").update({isento:!c.isento}).eq("id",c.id);
carregarClientes();
}

// ================= PIX WHATSAPP
function enviarPix(cliente){

if(!pixSistema) return alert("Cadastre o PIX");

const numero = (cliente.whatsapp || "").replace(/\D/g,"");

const mensagem = `
Olá ${cliente.name}

Valor: ${cliente.isento ? "ISENTO" : `R$ ${cliente.valor}`}

PIX: ${pixSistema}
`;

window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`);
}

// ================= BLOQUEIO
if(!usuario){
return <div style={{color:"#fff",padding:20}}>Carregando...</div>;
}

// ================= UI
return(

<div style={{padding:20,color:"#fff"}}>

<h2>👑 Master Admin</h2>

<input
placeholder="Seu PIX"
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

<hr/>

{clientes.map(c=>(

<div key={c.id} style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
borderBottom:"1px solid #333",
padding:10
}}>

<div style={{width:"25%"}}>{c.name}</div>
<div style={{width:"10%"}}>R$ {c.valor}</div>
<div style={{width:"10%"}}>{c.status}</div>
<div style={{width:"10%"}}>{c.pagou ? "Pago" : "Pendente"}</div>

<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>

<button onClick={()=>editarCliente(c)}>Editar</button>
<button onClick={()=>enviarPix(c)}>PIX</button>
<button onClick={()=>marcarPago(c)}>Pago</button>
<button onClick={()=>marcarPendente(c)}>Pend.</button>
<button onClick={()=>alterarStatus(c)}>Status</button>
<button onClick={()=>alternarIsencao(c)}>Isentar</button>
<button onClick={()=>excluirCliente(c.id)} style={{background:"red",color:"#fff"}}>Excluir</button>

</div>

</div>

))}

</div>

);
}