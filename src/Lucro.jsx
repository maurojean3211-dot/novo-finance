import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Lucro(){

const [empresaId,setEmpresaId] = useState(null);

const [kilosComprados,setKilosComprados] = useState(0);
const [kilosVendidos,setKilosVendidos] = useState(0);

const [totalCompras,setTotalCompras] = useState(0);
const [totalVendas,setTotalVendas] = useState(0);

const [lucro,setLucro] = useState(0);
const [estoque,setEstoque] = useState(0);

const [precoMedioVenda,setPrecoMedioVenda] = useState(0);
const [custoMedioCompra,setCustoMedioCompra] = useState(0);

const [comissaoTotal,setComissaoTotal] = useState(0);

useEffect(()=>{
carregarUsuario();
},[]);


// ================= USUARIO

async function carregarUsuario(){

const { data:userData } = await supabase.auth.getUser();

if(!userData?.user) return;

const { data:usuario } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",userData.user.id)
.single();

const empId = usuario?.empresa_id;

setEmpresaId(empId);

carregar(empId);

}


// ================= CARREGAR DADOS

async function carregar(empId){

const { data:comprasData } = await supabase
.from("compras")
.select("*")
.eq("empresa_id",empId);

const { data:vendasData } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empId);

calcular(comprasData || [], vendasData || []);

}


// ================= CALCULAR

function calcular(compras,vendas){

let kc = 0;
let kv = 0;

let tc = 0;
let tv = 0;

let comissao = 0;


// ===== COMPRAS

compras.forEach(c=>{

const material = (c.material || "").toUpperCase();

if(material !== "SUCATA" && material !== "CAVACO") return;

const kilos = Number(c.kilos || c.quantidade || 0);
const preco = Number(c.preco_compra || c.preco || 0);

kc += kilos;
tc += kilos * preco;

});


// ===== VENDAS

vendas.forEach(v=>{

const material = (v.material || "").toUpperCase();

if(material !== "SUCATA" && material !== "CAVACO") return;

const kilos = Number(v.kilos || v.quantidade || 0);
const valor = Number(v.valor_total || v.valor || 0);

kv += kilos;
tv += valor;

comissao += Number(v.comissao || 0);

});


// ===== RESULTADOS

setKilosComprados(kc);
setKilosVendidos(kv);

setTotalCompras(tc);
setTotalVendas(tv);

setLucro(tv - tc);

setEstoque(kc - kv);

setPrecoMedioVenda(
kv > 0 ? tv / kv : 0
);

setCustoMedioCompra(
kc > 0 ? tc / kc : 0
);

setComissaoTotal(comissao);

}


// ================= TELA

return(

<div style={{padding:20}}>

<h1>📈 Relatório de Lucro</h1>

<div style={{
background:"#111827",
padding:20,
borderRadius:10,
marginBottom:20,
color:"#fff"
}}>

<p>📦 Kilos Comprados: {kilosComprados} kg</p>

<p>📦 Kilos Vendidos: {kilosVendidos} kg</p>

<p>📦 Estoque Atual: {estoque} kg</p>

<hr/>

<p>💸 Total Compras: R$ {totalCompras.toFixed(2)}</p>

<p>💰 Total Vendas: R$ {totalVendas.toFixed(2)}</p>

<p>🏆 Lucro: R$ {lucro.toFixed(2)}</p>

<hr/>

<p>📊 Preço médio venda/kg: R$ {precoMedioVenda.toFixed(2)}</p>

<p>📉 Custo médio compra/kg: R$ {custoMedioCompra.toFixed(2)}</p>

<p>💵 Comissão Total: R$ {comissaoTotal.toFixed(2)}</p>

</div>

</div>

);

}