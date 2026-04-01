import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
PieChart,
Pie,
Cell,
Tooltip,
Legend,
ResponsiveContainer
} from "recharts";

export default function Dashboard(){

const [receitas,setReceitas] = useState(0);
const [pendente,setPendente] = useState(0);
const [dadosGrafico,setDadosGrafico] = useState([]);
const [carregando,setCarregando] = useState(true);

useEffect(()=>{
iniciar();
},[]);

async function iniciar(){

try{

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
setCarregando(false);
return;
}

// 🔥 SEU DASHBOARD (MASTER)
if(user.email === "maurojean3211@gmail.com"){
await carregarReceitaClientes();
setCarregando(false);
return;
}

// 🔥 outros usuários (mantém simples)
setCarregando(false);

}catch(err){
console.log(err);
setCarregando(false);
}

}

// ===============================
// 🔥 RECEITA DO MASTER (CORRIGIDO)
// ===============================
async function carregarReceitaClientes(){

const { data, error } = await supabase
.from("empresas")
.select("*");

if(error){
console.log(error);
return;
}

let totalReceita = 0;
let totalPendente = 0;

(data || []).forEach(c=>{

const valor = Number(c.valor || 0);

// ignora isento
if(c.isento) return;

// pago
if(c.pagou){
totalReceita += valor;
}else{
totalPendente += valor;
}

});

setReceitas(totalReceita);
setPendente(totalPendente);

// gráfico
setDadosGrafico([
{ name:"Recebido", value: totalReceita },
{ name:"Pendente", value: totalPendente }
]);

}

// ===============================

const cores=["#22c55e","#f59e0b"];

if(carregando){
return <div style={{padding:20,color:"#fff"}}>Carregando dados...</div>;
}

return(

<div style={{padding:15,color:"#fff"}}>

<h2 style={{marginBottom:15}}>📊 Dashboard</h2>

<div style={{
display:"grid",
gridTemplateColumns:"1fr",
gap:15,
marginBottom:20
}}>

<Card titulo="💰 Recebido" valor={receitas}/>
<Card titulo="⏳ Pendente" valor={pendente}/>
<Card titulo="📊 Total" valor={receitas + pendente}/>

</div>

<div style={{background:"#111827",padding:15,borderRadius:10}}>

<h3>Distribuição</h3>

<ResponsiveContainer width="100%" height={220}>
<PieChart>
<Pie data={dadosGrafico} dataKey="value" outerRadius={80}>
{dadosGrafico.map((e,i)=>(
<Cell key={i} fill={cores[i]} />
))}
</Pie>
<Tooltip/>
<Legend/>
</PieChart>
</ResponsiveContainer>

</div>

</div>

);

}

// ================= CARD

function Card({titulo,valor}){
return(
<div style={{
background:"#111827",
padding:15,
borderRadius:10
}}>
<h4>{titulo}</h4>
<p style={{
fontSize:20,
fontWeight:"bold",
color:"#22c55e"
}}>
R$ {Number(valor||0).toFixed(2)}
</p>
</div>
);
}