import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Fornecedores(){

const [fornecedores,setFornecedores]=useState([]);

const [nome,setNome]=useState("");
const [telefone,setTelefone]=useState("");
const [email,setEmail]=useState("");

useEffect(()=>{
carregarFornecedores();
},[]);

// =============================
// LISTAR
// =============================
async function carregarFornecedores(){

try{

const { data:auth } = await supabase.auth.getUser();

const user = auth?.user;

if(!user) return;

const {data,error} = await supabase
.from("fornecedores")
.select("*")
.eq("user_id",user.id)
.order("data_cadastro",{ascending:false});

if(error){
console.log("Erro ao carregar fornecedores:",error);
return;
}

setFornecedores(data || []);

}catch(err){

console.log("Erro geral:",err);

}

}

// =============================
// SALVAR
// =============================
async function salvarFornecedor(e){

e.preventDefault();

if(!nome.trim()){

alert("Informe o nome do fornecedor");
return;

}

const { data:auth } = await supabase.auth.getUser();
const user = auth?.user;

if(!user) return;

const {error} = await supabase
.from("fornecedores")
.insert([{

nome,
telefone,
email,
data_cadastro:new Date().toISOString().split("T")[0],
user_id:user.id

}]);

if(error){

console.log(error);
alert("Erro ao salvar fornecedor");

return;

}

alert("✅ Fornecedor salvo!");

setNome("");
setTelefone("");
setEmail("");

carregarFornecedores();

}

// =============================
// EXCLUIR
// =============================
async function excluirFornecedor(id){

if(!window.confirm("Deseja excluir este fornecedor?")) return;

const {error} = await supabase
.from("fornecedores")
.delete()
.eq("id",id);

if(error){

console.log(error);
alert("Erro ao excluir");

return;

}

carregarFornecedores();

}

// =============================
// FORMATAR DATA
// =============================
function formatarData(data){

if(!data) return "";

return new Date(data).toLocaleDateString("pt-BR");

}

// =============================
// TELA
// =============================
return(

<div style={{padding:20}}>

<h1>🏭 Fornecedores</h1>

<form onSubmit={salvarFornecedor}>

<input
placeholder="Nome do fornecedor"
value={nome}
onChange={e=>setNome(e.target.value)}
style={{width:"300px",padding:"8px"}}
/>

<br/><br/>

<input
placeholder="Telefone"
value={telefone}
onChange={e=>setTelefone(e.target.value)}
style={{width:"300px",padding:"8px"}}
/>

<br/><br/>

<input
placeholder="Email"
value={email}
onChange={e=>setEmail(e.target.value)}
style={{width:"300px",padding:"8px"}}
/>

<br/><br/>

<button type="submit"
style={{
background:"#22c55e",
color:"#fff",
border:"none",
padding:"10px 15px",
borderRadius:"6px",
cursor:"pointer"
}}

>

Salvar Fornecedor

</button>

</form>

<hr/>

{fornecedores.map((f)=>(

<div
key={f.id}
style={{
border:"1px solid #ccc",
padding:"10px",
borderRadius:"6px",
marginBotto
