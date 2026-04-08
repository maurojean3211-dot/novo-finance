import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Dashboard(){

const [dados,setDados] = useState([]);
const [receitas,setReceitas] = useState(0);
const [pendente,setPendente] = useState(0);
const [totalClientes,setTotalClientes] = useState(0);
const [totalPagos,setTotalPagos] = useState(0);
const [totalBloqueados,setTotalBloqueados] = useState(0);

useEffect(()=>{
carregar();
},[]);

async function carregar(){

const { data, error } = await supabase
.from("empresas")
.select("*");

if(error){
alert(error.message);
return;
}

console.log("DADOS DO BANCO:", data); // 🔥 DEBUG

setDados(data || []);

let recebido = 0;
let pend = 0;
let pagos = 0;
let bloqueados = 0;

(data || []).forEach(c=>{

const valor = Number(c.valor || 0);

// 🔥 MOSTRA O QUE ESTÁ VINDO
console.log("CLIENTE:", c.name, "PAGOU:", c.pagou, "VALOR:", valor);

if(c.status === "Bloqueado") bloqueados++;

// 🔥 TRATAMENTO UNIVERSAL
const pagou =
c.pagou === true ||
c.pagou === "true" ||
c.pagou === 1 ||
c.pagou === "1" ||
c.pagou === "Pago" ||
c.pagou === "pago";

if(pagou){
recebido += valor;
pagos++;
}else{
pend += valor;
}

});

setReceitas(recebido);
setPendente(pend);
setTotalClientes(data.length);
setTotalPagos(pagos);
setTotalBloqueados(bloqueados);
}

return(

<div style={{padding:20,color:"#fff"}}>

<h2>📊 Dashboard (DEBUG)</h2>

<p>💰 Recebido: R$ {receitas}</p>
<p>⏳ Pendente: R$ {pendente}</p>
<p>👥 Clientes: {totalClientes}</p>
<p>✅ Pagos: {totalPagos}</p>
<p>🚫 Bloqueados: {totalBloqueados}</p>

</div>

);
}