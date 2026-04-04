
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista(){

const [dados, setDados] = useState([]);
const [editandoId, setEditandoId] = useState(null);

const [pixChave, setPixChave] = useState("");
const [pixEdit, setPixEdit] = useState("");
const [empresaRealId, setEmpresaRealId] = useState(null);

const [cliente, setCliente] = useState("");
const [telefone, setTelefone] = useState("");
const [valor, setValor] = useState("");
const [juros, setJuros] = useState("");
const [dataVencimento, setDataVencimento] = useState("");

// ================= INIT
useEffect(()=>{
carregarEmpresa();
},[]);

// ================= EMPRESA
async function carregarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return;

const { data:usuario } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id", user.id)
.single();

if(!usuario?.empresa_id){
alert("Sem empresa vinculada");
return;
}

setEmpresaRealId(usuario.empresa_id);

carregarDados(usuario.empresa_id);
carregarPix(usuario.empresa_id);

}

// ================= DADOS
async function carregarDados(empresa_id){

const { data } = await supabase
.from("emprestimos")
.select("*")
.eq("empresa_id", empresa_id)
.order("data_vencimento",{ascending:true});

setDados(data || []);

}

// ================= PIX
async function carregarPix(empresa_id){

const { data } = await supabase
.from("empresas")
.select("*")
.eq("id", empresa_id)
.single();

if(data){
setPixChave(data.pix_chave || "");
setPixEdit(data.pix_chave || "");
}

}

async function salvarPix(){

if(!empresaRealId) return alert("Empresa não carregada");

const { error } = await supabase
.from("empresas")
.update({ pix_chave: pixEdit })
.eq("id", empresaRealId);

if(error){
alert(error.message);
return;
}

alert("PIX salvo!");
carregarPix(empresaRealId);

}

// ================= SALVAR
async function salvar(){

if(!empresaRealId) return alert("Empresa não carregada");

if(!cliente || !valor || !dataVencimento){
alert("Preencha os campos");
return;
}

const valorBase = Number(valor);
const jurosPercentual = Number(juros || 0);
const total = valorBase + (valorBase * jurosPercentual / 100);

const { error } = await supabase
.from("emprestimos")
.insert([{
empresa_id: empresaRealId,
cliente,
telefone,
valor: valorBase,
juros: jurosPercentual,
total,
data_vencimento: dataVencimento,
status: "pendente"
}]);

if(error){
alert("Erro: " + error.message);
return;
}

alert("Salvo!");

setCliente("");
setTelefone("");
setValor("");
setJuros("");
setDataVencimento("");

carregarDados(empresaRealId);

}

// ================= TELA
return(

<div style={{padding:20, color:"#fff"}}>

<h2>💰 Empréstimos</h2>

{/* PIX */}
<div style={{
background:"#1f2937",
padding:15,
borderRadius:8,
marginBottom:20
}}>

<h3>Minha chave PIX</h3>

<div>{pixChave || "Nenhuma chave cadastrada"}</div>

<input
value={pixEdit}
onChange={e=>setPixEdit(e.target.value)}
style={{width:"100%", marginTop:10}}
/>

<button onClick={salvarPix} style={{marginTop:10}}>
Salvar PIX
</button>

</div>

{/* FORM */}
<div style={{
background:"#111827",
padding:15,
borderRadius:8,
marginBottom:20
}}>

<input placeholder="Cliente" value={cliente} onChange={e=>setCliente(e.target.value)} /><br/><br/>
<input placeholder="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} /><br/><br/>
<input placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)} /><br/><br/>
<input placeholder="Juros %" value={juros} onChange={e=>setJuros(e.target.value)} /><br/><br/>

<input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} /><br/><br/>

<button onClick={salvar}>
Salvar
</button>

</div>

{/* LISTA */}
{dados.map(p=>(

<div key={p.id} style={{
background:"#1f2937",
padding:10,
borderRadius:6,
marginBottom:10
}}>

<strong>{p.cliente}</strong><br/>
R$ {p.total}

</div>

))}

</div>

);

}