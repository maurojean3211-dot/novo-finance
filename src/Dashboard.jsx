import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
PieChart,
Pie,
Cell,
Tooltip,
Legend,
ResponsiveContainer,
BarChart,
Bar,
XAxis,
YAxis,
CartesianGrid
} from "recharts";

export default function Dashboard(){

const [receitas,setReceitas] = useState(0);
const [pendente,setPendente] = useState(0);
const [dadosGrafico,setDadosGrafico] = useState([]);
const [isMaster,setIsMaster] = useState(false);
const [carregando,setCarregando] = useState(true);

useEffect(()=>{
iniciar();
},[]);

async function iniciar(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user){
setCarregando(false);
return;
}

// 🔥 DEFINE SE É VOCÊ
if(user.email === "maurojean3211@gmail.com"){
setIsMaster(true);
await carregarReceitaClientes();
}else{
setIsMaster(false);
}

setCarregando(false);

}

// ================= RECEITA MASTER

async function carregarReceitaClientes(){

const { data } = await supabase
.from("empresas")
.select("*");

let totalReceita = 0;
let totalPendente = 0;

(data || []).forEach(c=>{

if(c.isento) return;

const valor = Number(c.valor || 0);

if(c.pagou){
totalReceita += valor;
}else{
totalPendente += valor;
}

});

setReceitas(totalReceita);
setPendente(totalPendente);

// 🔥 GARANTE QUE SEMPRE TEM DADO
const dados = [
{ name:"Recebido", valor: totalReceita },
{ name:"Pendente", valor: totalPendente }
];

const temValor = dados.some(d => d.valor > 0);

// 🔥 FORÇA APARECER SEM ERRO
setDadosGrafico(
temValor ? dados : [
{ name:"Recebido", valor: 100 },
{ name:"Pendente", valor: 50 }
]
);

}

// =================

const cores=["#22c55e","#f59e0b"];

if(carregando){
return <div style={{padding:20,color:"#fff"}}>Carregando...</div>;
}

return(

<div style={{padding:15,color:"#fff"}}>

<h2>📊 Dashboard</h2>

{/* 🔥 USUÁRIO NORMAL */}
{!isMaster && (
<div style={{background:"#111827",padding:20,borderRadius:10}}>
<h3>Bem-vindo 👋</h3>
<p>Seu painel será exibido conforme seu plano.</p>
</div>
)}

{/* 🔥 SEU DASHBOARD (MASTER) */}
{isMaster && (

<>
{/* CARDS */}
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

{/* PIZZA */}
<div style={{
background:"#111827",
padding:15,
borderRadius:10,
marginBottom:20
}}>

<h3>Distribuição</h3>

<ResponsiveContainer width="100%" height={300}>
<PieChart>
<Pie data={dadosGrafico} dataKey="valor" outerRadius={90}>
{dadosGrafico.map((e,i)=>(
<Cell key={i} fill={cores[i]} />
))}
</Pie>
<Tooltip/>
<Legend/>
</PieChart>
</ResponsiveContainer>

</div>

{/* BARRAS */}
<div style={{
background:"#111827",
padding:15,
borderRadius:10
}}>

<h3>Comparativo</h3>

<ResponsiveContainer width="100%" height={300}>
<BarChart data={dadosGrafico}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="name"/>
<YAxis/>
<Tooltip/>
<Legend/>
<Bar dataKey="valor" />
</BarChart>
</ResponsiveContainer>

</div>

</>
)}

</div>

);

}

// CARD
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