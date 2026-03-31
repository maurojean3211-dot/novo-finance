import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";

export default function Financeiro({ empresaId }){

const [lancamentos,setLancamentos] = useState([]);
const [carregando,setCarregando] = useState(true);
const [pixAtual,setPixAtual] = useState(null);
const [pixChave,setPixChave] = useState("");

// ================= INIT

useEffect(()=>{

if(!empresaId){
setCarregando(false); // 🔥 NÃO TRAVA MAIS
return;
}

iniciar();

},[empresaId]);

async function iniciar(){

setCarregando(true); // 🔥 GARANTE LOADING CORRETO

try{
await buscarPix();
await carregarLancamentos();
}catch(e){
console.log("Erro iniciar:",e);
}

setCarregando(false);
}

// ================= BUSCAR PIX

async function buscarPix(){

if(!empresaId) return; // 🔥 PROTEÇÃO

const { data, error } = await supabase
.from("empresas")
.select("pix_chave")
.eq("id",empresaId)
.single();

if(error){
console.log("Erro PIX:",error);
return;
}

setPixChave(String(data?.pix_chave || ""));
}

// ================= LANCAMENTOS

async function carregarLancamentos(){

if(!empresaId) return; // 🔥 PROTEÇÃO

const { data, error } = await supabase
.from("lancamentos")
.select("*")
.eq("empresa_id",empresaId)
.order("data_lancamento",{ascending:false});

if(error){
console.log("Erro lançamentos:",error);
return;
}

setLancamentos(data || []);
}

// ================= EXCLUIR

async function excluir(id){

await supabase
.from("lancamentos")
.delete()
.eq("id",id);

carregarLancamentos();
}

// ================= PIX

function gerarPix(l){
setPixAtual(l.id === pixAtual?.id ? null : l);
}

function formatarData(data){
if(!data) return "-";
return new Date(data).toLocaleDateString("pt-BR");
}

function gerarCodigoPix(valor){

if(!pixChave) return "";

const nome = "CUNHA";
const cidade = "ITATIBA";

const valorFormatado = Number(valor || 0).toFixed(2);

function campo(id,valor){
return id + valor.length.toString().padStart(2,"0") + valor;
}

let payload =
"000201010212" +
campo("26",
campo("00","BR.GOV.BCB.PIX") +
campo("01",pixChave)
) +
campo("52","0000") +
campo("53","986") +
campo("54",valorFormatado) +
campo("58","BR") +
campo("59",nome) +
campo("60",cidade) +
campo("62",campo("05","***"));

function crc16(str){

let crc = 0xFFFF;

for(let c=0;c<str.length;c++){
crc ^= str.charCodeAt(c) << 8;

for(let i=0;i<8;i++){
crc = crc & 0x8000
? (crc<<1)^0x1021
: crc<<1;
}
}

crc &= 0xFFFF;

return crc.toString(16).toUpperCase().padStart(4,"0");
}

payload += "6304" + crc16(payload + "6304");

return payload;
}

function copiarPix(valor){

const codigo = gerarCodigoPix(valor);

if(!codigo){
alert("Erro ao gerar PIX");
return;
}

navigator.clipboard.writeText(codigo)
.then(()=> alert("PIX copiado!"))
.catch(()=> alert("Erro ao copiar"));
}

// ================= TELA

if(carregando){
return (
<div style={{padding:20,color:"#fff"}}>
Carregando dados...
</div>
);
}

if(!empresaId){
return (
<div style={{padding:20,color:"#fff"}}>
Empresa não carregada ⚠️
</div>
);
}

return(

<div style={{padding:20}}>

<h1>💰 Financeiro</h1>

{lancamentos.length === 0 && (
<p style={{color:"#aaa"}}>Nenhum lançamento encontrado</p>
)}

{lancamentos.map(l=>{

const codigoPix = gerarCodigoPix(Number(l.valor));

return(

<div
key={l.id}
style={{
border:"1px solid #333",
padding:15,
marginBottom:20,
borderRadius:10,
background:"#111"
}}
>

<strong>{l.tipo}</strong>

<br/>

{l.descricao || "-"}

<br/>

📅 {formatarData(l.data_lancamento)}

<br/>

💰 R$ {Number(l.valor || 0).toFixed(2)}

<br/><br/>

{l.tipo === "receita" && (
<button style={{width:"100%",marginBottom:5}} onClick={()=>gerarPix(l)}>
💳 PIX
</button>
)}

<button style={{width:"100%"}} onClick={()=>excluir(l.id)}>
🗑 Excluir
</button>

{pixAtual?.id === l.id && (

<div style={{marginTop:20}}>

<h3>Pagamento PIX</h3>

<QRCodeCanvas value={codigoPix || "PIX"} size={200}/>

<textarea style={{width:"100%"}} value={codigoPix} readOnly />

<br/>

<button style={{width:"100%"}} onClick={()=>copiarPix(Number(l.valor))}>
📋 Copiar PIX
</button>

</div>

)}

</div>

)

})}

</div>

);

}