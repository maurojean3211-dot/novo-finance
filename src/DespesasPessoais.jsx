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
BarChart,
Bar
} from "recharts";

export default function DespesasPessoais(){

const [lancamentos,setLancamentos] = useState([]);

const [tipo,setTipo] = useState("despesa");
const [categoria,setCategoria] = useState("Supermercado");
const [descricao,setDescricao] = useState("");
const [valor,setValor] = useState("");

const [data,setData] = useState(
new Date().toISOString().split("T")[0]
);

const [receitas,setReceitas] = useState(0);
const [despesas,setDespesas] = useState(0);
const [saldo,setSaldo] = useState(0);

const [dadosGrafico,setDadosGrafico] = useState([]);
const [dadosMes,setDadosMes] = useState([]);
const [dadosCategoria,setDadosCategoria] = useState([]);

const [empresaId,setEmpresaId] = useState(null);

// ================= BUSCAR EMPRESA
useEffect(()=>{
buscarEmpresa();
},[]);

async function buscarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return;

const { data } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("email",user.email)
.single();

if(data){
setEmpresaId(data.empresa_id);
carregar(data.empresa_id);
}

}

// ================= CARREGAR
async function carregar(empresa_id){

const { data, error } = await supabase
.from("despesas")
.select("*")
.eq("empresa_id",empresa_id)
.order("data_lancamento",{ascending:false});

if(error){
console.log(error);
return;
}

setLancamentos(data || []);
calcular(data || []);

}

// ================= CALCULAR
function calcular(lista){

let totalReceita = 0;
let totalDespesa = 0;

const meses={};
const categorias={};

lista.forEach(l=>{

const valor = Number(l.valor || 0);

if(l.tipo==="receita"){
totalReceita += valor;
}

if(l.tipo==="despesa"){
totalDespesa += valor;

if(!categorias[l.categoria]){
categorias[l.categoria]=0;
}

categorias[l.categoria]+=valor;

}

let mes = new Date(l.data_lancamento).getMonth()+1;

if(!meses[mes]){
meses[mes]=0;
}

if(l.tipo==="receita"){
meses[mes]+=valor;
}

if(l.tipo==="despesa"){
meses[mes]-=valor;
}

});

setReceitas(totalReceita);
setDespesas(totalDespesa);
setSaldo(totalReceita-totalDespesa);

setDadosGrafico([
{ name:"Receitas", value: totalReceita },
{ name:"Despesas", value: totalDespesa }
]);

const nomesMes=[
"Jan","Fev","Mar","Abr","Mai","Jun",
"Jul","Ago","Set","Out","Nov","Dez"
];

const linhaMes = Object.keys(meses).map(m=>({
mes: nomesMes[m-1],
valor: meses[m]
}));

setDadosMes(linhaMes);

const categoriaGrafico = Object.keys(categorias).map(c=>({
categoria:c,
valor:categorias[c]
}));

setDadosCategoria(categoriaGrafico);

}

// ================= SALVAR (CORRIGIDO DEFINITIVO)
async function salvar(){

if(!empresaId){
alert("Empresa não carregada ainda");
return;
}

if(!descricao || !valor){
alert("Preencha descrição e valor");
return;
}

const novo = {
empresa_id:empresaId,
tipo,
categoria,
descricao,
valor:Number(valor),
data_lancamento:data
};

const { data:inserido, error } = await supabase
.from("despesas")
.insert([novo])
.select()
.single();

if(error){
console.log("ERRO AO SALVAR:", error);
alert("Erro ao salvar");
return;
}

setDescricao("");
setValor("");

// 🔥 ATUALIZA NA HORA
const novaLista = [inserido, ...lancamentos];
setLancamentos(novaLista);
calcular(novaLista);

}

// ================= EXCLUIR (CORRIGIDO)
async function excluir(id){

if(!window.confirm("Excluir lançamento?")) return;

const { error } = await supabase
.from("despesas")
.delete()
.eq("id",id)
.eq("empresa_id",empresaId);

if(error){
alert("Erro ao excluir");
return;
}

// 🔥 REMOVE NA HORA
const novaLista = lancamentos.filter(l=>l.id !== id);
setLancamentos(novaLista);
calcular(novaLista);

}

const cores=["#22c55e","#ef4444"];

return(

<div style={{padding:20}}>

<h1>💳 Finanças Pessoais</h1>

<h2>Saldo: R$ {saldo.toFixed(2)}</h2>

<div style={{display:"flex",gap:20}}>
<p style={{color:"green"}}>Receitas: R$ {receitas.toFixed(2)}</p>
<p style={{color:"red"}}>Despesas: R$ {despesas.toFixed(2)}</p>
</div>

<div
style={{
display:"grid",
gridTemplateColumns:"1fr 400px",
gap:40,
marginTop:30
}}
>

<div>

<h3>Receitas x Despesas</h3>

<PieChart width={300} height={250}>
<Pie data={dadosGrafico} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
{dadosGrafico.map((entry,index)=>(
<Cell key={index} fill={cores[index % cores.length]} />
))}
</Pie>
<Tooltip/>
<Legend/>
</PieChart>

<h3>Movimentação Mensal</h3>

<LineChart width={400} height={250} data={dadosMes}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="mes"/>
<YAxis/>
<Tooltip/>
<Line type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={3}/>
</LineChart>

<h3>Gastos por Categoria</h3>

<BarChart width={400} height={250} data={dadosCategoria}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="categoria"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="valor" fill="#ef4444"/>
</BarChart>

</div>

<div>

<h2>Novo Lançamento</h2>

<input type="date" value={data} onChange={e=>setData(e.target.value)}/>

<br/><br/>

<select value={tipo} onChange={e=>setTipo(e.target.value)}>
<option value="despesa">Despesa</option>
<option value="receita">Receita</option>
</select>

<br/><br/>

<select value={categoria} onChange={e=>setCategoria(e.target.value)}>
<option>Supermercado</option>
<option>Gasolina</option>
<option>Aluguel</option>
<option>Luz</option>
<option>Água</option>
<option>Internet</option>
<option>Farmácia</option>
<option>Outros</option>
</select>

<br/><br/>

<input placeholder="Descrição" value={descricao} onChange={e=>setDescricao(e.target.value)}/>

<br/><br/>

<input type="number" placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)}/>

<br/><br/>

<button onClick={salvar}>Salvar</button>

</div>

</div>

<hr/>

<h2>Lançamentos</h2>

{lancamentos.map(l=>(

<div key={l.id} style={{border:"1px solid #334155",padding:12,marginBottom:10,borderRadius:6}}>

<strong>{l.categoria}</strong>

<br/>

{l.descricao}

<br/>

📅 {l.data_lancamento}

<br/>

<span style={{
color:l.tipo==="receita"?"#22c55e":"#ef4444",
fontWeight:"bold"
}}>
R$ {Number(l.valor).toFixed(2)}
</span>

<br/>

<button onClick={()=>excluir(l.id)} style={{
marginTop:8,
padding:"6px 12px",
background:"#dc2626",
color:"#fff",
border:"none",
borderRadius:6,
cursor:"pointer"
}}>
🗑 Excluir
</button>

</div>

))}

</div>

);

}