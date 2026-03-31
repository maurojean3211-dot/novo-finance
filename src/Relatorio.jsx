import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Relatorio({ empresaId }){

const [dados,setDados] = useState([]);
const [inicio,setInicio] = useState("");
const [fim,setFim] = useState("");

useEffect(()=>{
  carregar();
},[]);

async function carregar(){

let query = supabase
.from("lancamentos")
.select("*")
.eq("empresa_id",empresaId);

if(inicio && fim){
  query = query.gte("data",inicio).lte("data",fim);
}

const { data } = await query;

setDados(data || []);
}

const totalEntradas = dados
.filter(d=>d.tipo==="entrada")
.reduce((acc,d)=>acc + Number(d.valor),0);

const totalSaidas = dados
.filter(d=>d.tipo==="despesa")
.reduce((acc,d)=>acc + Number(d.valor),0);

const saldo = totalEntradas - totalSaidas;

return(
<div>

<h2>📊 Relatório</h2>

<div style={{display:"flex",gap:10}}>
<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)} />
<input type="date" value={fim} onChange={e=>setFim(e.target.value)} />
<button onClick={carregar}>Filtrar</button>
</div>

<hr/>

<p>💰 Entradas: R$ {totalEntradas.toFixed(2)}</p>
<p>💸 Saídas: R$ {totalSaidas.toFixed(2)}</p>
<p>📊 Saldo: R$ {saldo.toFixed(2)}</p>

</div>
);
}