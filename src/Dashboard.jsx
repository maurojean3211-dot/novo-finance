import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
PieChart,
Pie,
Cell,
Tooltip,
Legend,
LineChart,
Line,
XAxis,
YAxis,
CartesianGrid,
ResponsiveContainer
} from "recharts";

export default function Dashboard(){

const [receitas,setReceitas] = useState(0);
const [despesas,setDespesas] = useState(0);
const [saldo,setSaldo] = useState(0);

const [dadosGrafico,setDadosGrafico] = useState([]);
const [dadosMes,setDadosMes] = useState([]);

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

const { data:usuario } = await supabase
.from("usuarios")
.select("empresa_id, role")
.eq("id",user.id)
.maybeSingle();

// 🔥 CARREGA TUDO
await carregarDados(usuario?.empresa_id);

}catch(err){
console.log(err);
}

setCarregando(false);

}

async function carregarDados(empresa_id){

const dataLimite = new Date();
dataLimite.setMonth(dataLimite.getMonth()-3);

// ===== LANCAMENTOS
const {data:lancamentos} = await supabase
.from("lancamentos")
.select("*")
.gte("data_lancamento", dataLimite.toISOString())
.limit(200);

// ===== VENDAS
const {data:vendas} = await supabase
.from("vendas")
.select("*");

// ===== COMPRAS
const {data:compras} = await supabase
.from("compras")
.select("*");

calcularDados(lancamentos || [], vendas || [], compras || []);

}

function calcularDados(lista,vendas,compras){

let totalReceita=0;
let totalDespesa=0;

// ===== LANCAMENTOS
lista.forEach(l=>{
const tipo = String(l.tipo || "").toLowerCase();
const valor = Number(l.valor || 0);

if(tipo==="receita") totalReceita+=valor;
if(tipo==="despesa") totalDespesa+=valor;
});

// ===== SOMA VENDAS COMO RECEITA
vendas.forEach(v=>{
totalReceita += Number(v.valor_total || v.valor || 0);
});

// ===== SOMA COMPRAS COMO DESPESA
compras.forEach(c=>{
const kilos = Number(c.kilos || c.quantidade || 0);
const preco = Number(c.preco_compra || c.preco || 0);

totalDespesa += kilos * preco;
});

// ===== RESULTADO
setReceitas(totalReceita);
setDespesas(totalDespesa);
setSaldo(totalReceita-totalDespesa);

// ===== GRAFICO
setDadosGrafico([
{ name:"Receitas", value:totalReceita },
{ name:"Despesas", value:totalDespesa }
]);

// ===== MENSAL
const meses={};

lista.forEach(l=>{

let mes = Number(l.mes);

if(!mes && l.data_lancamento){
mes = new Date(l.data_lancamento).getMonth()+1;
}

if(!mes) return;

if(!meses[mes]) meses[mes]=0;

const tipo = String(l.tipo || "").toLowerCase();
const valor = Number(l.valor || 0);

if(tipo==="receita") meses[mes]+=valor;
if(tipo==="despesa") meses[mes]-=valor;

});

const nomesMes=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

setDadosMes(
Object.keys(meses)
.sort((a,b)=>a-b)
.map(m=>({
mes: nomesMes[m-1],
valor: meses[m]
}))
);

}

const cores=["#22c55e","#ef4444"];

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

<Card titulo="💰 Receitas" valor={receitas}/>
<Card titulo="💸 Despesas" valor={despesas}/>
<Card titulo="🏦 Saldo" valor={saldo}/>

</div>

<div style={{
display:"flex",
flexDirection:"column",
gap:20
}}>

<div style={{background:"#111827",padding:15,borderRadius:10}}>
<h3>Distribuição</h3>

<ResponsiveContainer width="100%" height={200}>
<PieChart>
<Pie data={dadosGrafico} dataKey="value" outerRadius={70}>
{dadosGrafico.map((e,i)=>(
<Cell key={i} fill={cores[i]} />
))}
</Pie>
<Tooltip/>
<Legend/>
</PieChart>
</ResponsiveContainer>

</div>

<div style={{background:"#111827",padding:15,borderRadius:10}}>
<h3>Mensal</h3>

<ResponsiveContainer width="100%" height={200}>
<LineChart data={dadosMes}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="mes"/>
<YAxis/>
<Tooltip/>
<Line type="monotone" dataKey="valor" stroke="#22c55e"/>
</LineChart>
</ResponsiveContainer>

</div>

</div>

</div>

);

}

function Card({titulo,valor}){
return(
<div style={{
background:"#111827",
padding:15,
borderRadius:10
}}>
<h4>{titulo}</h4>
<p style={{fontSize:20,fontWeight:"bold",color:"#22c55e"}}>
R$ {Number(valor||0).toFixed(2)}
</p>
</div>
);
}