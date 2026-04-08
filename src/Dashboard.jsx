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

const [totalClientes,setTotalClientes] = useState(0);
const [totalPagos,setTotalPagos] = useState(0);
const [totalBloqueados,setTotalBloqueados] = useState(0);

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

// 🔥 MASTER
if(user.email === "maurojean3211@gmail.com"){
setIsMaster(true);
await carregarDadosMaster();
}else{
setIsMaster(false);
}

setCarregando(false);

}

// ================= MASTER
async function carregarDadosMaster(){

const { data, error } = await supabase
.from("empresas")
.select("*");

if(error){
alert(error.message);
return;
}

let totalReceita = 0;
let totalPend = 0;
let pagos = 0;
let bloqueados = 0;

(data || []).forEach(c=>{

if(c.status === "Bloqueado") bloqueados++;

if(c.isento) return;

const valor = Number(c.valor || 0);

if(c.pagou){
totalReceita += valor;
pagos++;
}else{
totalPend += valor;
}

});

setReceitas(totalReceita);
setPendente(totalPend);
setTotalClientes(data.length);
setTotalPagos(pagos);
setTotalBloqueados(bloqueados);

// gráfico
const dados = [
{ name:"Recebido", valor: totalReceita },
{ name:"Pendente", valor: totalPend }
];

const temValor = dados.some(d => d.valor > 0);

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

{/* USUÁRIO NORMAL */}
{!isMaster && (
<div style={{background:"#111827",padding:20,borderRadius:10}}>
<h3>Bem-vindo 👋</h3>
<p>Seu painel será exibido conforme seu plano.</p>
</div>
)}

{/* MASTER */}
{isMaster && (

<>

{/* CARDS PRINCIPAIS */}
<div style={{
display:"grid",
gridTemplateColumns:"repeat(2,1fr)",
gap:15,
marginBottom:20
}}>

<Card titulo="💰 Recebido" valor={receitas}/>
<Card titulo="⏳ Pendente" valor={pendente}/>
<Card titulo="📊 Total" valor={receitas + pendente}/>
<Card titulo="👥 Clientes" valor={totalClientes}/>

<Card titulo="✅ Pagos" valor={totalPagos}/>
<Card titulo="🚫 Bloqueados" valor={totalBloqueados}/>

</div>

{/* GRÁFICO PIZZA */}
<div style={{
background:"#111827",
padding:15,
borderRadius:10,
marginBottom:20
}}>

<h3>Distribuição Financeira</h3>

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

{/* GRÁFICO BARRA */}
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
<Bar dataKey="valor" fill="#3b82f6" />
</BarChart>
</ResponsiveContainer>

</div>

</>
)}

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
{typeof valor === "number"
? `R$ ${valor.toFixed(2)}`
: valor}
</p>
</div>
);
}