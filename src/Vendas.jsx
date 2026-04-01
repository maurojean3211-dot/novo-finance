import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";

export default function Vendas(){

const [clientes,setClientes] = useState([]);
const [produtos,setProdutos] = useState([]);
const [vendas,setVendas] = useState([]);

const [clienteId,setClienteId] = useState("");
const [clienteNome,setClienteNome] = useState("");
const [clienteWhatsapp,setClienteWhatsapp] = useState("");

const [produtoId,setProdutoId] = useState("");

const [quantidade,setQuantidade] = useState("");
const [precoUnitario,setPrecoUnitario] = useState("");

const [parcelas,setParcelas] = useState(1);

const [pixEmpresa,setPixEmpresa] = useState("");

const [dataVenda,setDataVenda] = useState(
new Date().toISOString().split("T")[0]
);

const [empresaId,setEmpresaId] = useState(null);

const [userEmail,setUserEmail] = useState(null);

useEffect(()=>{
buscarEmpresa();
},[]);

// ================= EMPRESA

async function buscarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return;

setUserEmail(user.email);

const { data,error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(error) return;

if(!data?.empresa_id) return;

setEmpresaId(data.empresa_id);

buscarPix(data.empresa_id);
buscarDados(data.empresa_id);

}

// 🔥 BLOQUEIO
if(userEmail && userEmail !== "maurojean3211@gmail.com"){
return <div style={{padding:20,color:"#fff"}}>⛔ Acesso restrito</div>;
}

// ================= PIX

async function buscarPix(empresa_id){

const { data } = await supabase
.from("empresas")
.select("pix_chave")
.eq("id",empresa_id)
.single();

if(data){
setPixEmpresa(data.pix_chave || "");
}

}

// ================= DADOS

async function buscarDados(empresa_id){

const { data:clientesData } = await supabase
.from("clientes")
.select("*")
.eq("empresa_id",empresa_id)
.order("nome");

const { data:produtosData } = await supabase
.from("produtos")
.select("*")
.eq("empresa_id",empresa_id);

const { data:vendasData } = await supabase
.from("vendas")
.select("*")
.eq("empresa_id",empresa_id)
.order("data_venda",{ascending:false});

setClientes(clientesData || []);
setProdutos(produtosData || []);
setVendas(vendasData || []);

}

// ================= CALCULOS

const qtd = parseFloat(quantidade) || 0;
const preco = parseFloat(precoUnitario) || 0;

const valorTotal = preco * qtd;
const valorParcela = parcelas > 0 ? valorTotal / parcelas : valorTotal;

const comissao = qtd * 0.05;

// ================= SALVAR

async function salvarVenda(){

if(!empresaId) return alert("Empresa não carregada");

if(!clienteNome) return alert("Informe o cliente");

if(qtd <= 0) return alert("Quantidade inválida");

const { data:{ user } } = await supabase.auth.getUser();

// 🔥 CRIA CLIENTE SE NÃO EXISTIR
let clienteFinalId = clienteId;

if(!clienteId){

const { data:novoCliente } = await supabase
.from("clientes")
.insert([{
nome: clienteNome,
empresa_id: empresaId
}])
.select()
.single();

clienteFinalId = novoCliente?.id;
}

const { error } = await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_id:clienteFinalId,
produto: produtoId || null, // 🔥 AGORA TEXTO LIVRE
kilos:qtd,
preco_unitario:preco,
valor_total:valorTotal,
comissao:comissao,
data_venda:dataVenda,
user_id:user.id
}]);

if(error){
console.log(error);
alert("Erro ao salvar venda");
return;
}

alert("Venda registrada!");

setQuantidade("");
setPrecoUnitario("");
setParcelas(1);
setClienteNome("");
setClienteId("");
setProdutoId("");

buscarDados(empresaId);

}

// ================= TELA

return(

<div style={{padding:20}}>

<h1>🛒 Registrar Venda</h1>

<label>Data</label><br/>

<input
type="date"
value={dataVenda}
onChange={e=>setDataVenda(e.target.value)}
/>

<br/><br/>

{/* CLIENTE LIVRE */}
<input
list="lista-clientes"
placeholder="Digite ou selecione cliente"
value={clienteNome}
onChange={e=>{
setClienteNome(e.target.value);

const cliente = clientes.find(c=>c.nome === e.target.value);

if(cliente){
setClienteId(cliente.id);
setClienteWhatsapp(cliente.whatsapp || "");
}else{
setClienteId("");
}
}}
/>

<datalist id="lista-clientes">
{clientes.map(c=>(
<option key={c.id} value={c.nome} />
))}
</datalist>

<br/><br/>

{/* 🔥 PRODUTO LIVRE */}
<input
list="lista-produtos"
placeholder="Digite ou selecione produto"
value={produtoId}
onChange={e=>setProdutoId(e.target.value)}
/>

<datalist id="lista-produtos">
{produtos.map(p=>(
<option key={p.id} value={p.nome} />
))}
</datalist>

<br/><br/>

<input
type="number"
placeholder="Quantidade"
value={quantidade}
onChange={e=>setQuantidade(e.target.value)}
/>

<br/><br/>

<input
type="number"
placeholder="Valor unitário"
value={precoUnitario}
onChange={e=>setPrecoUnitario(e.target.value)}
/>

<br/><br/>

<input
type="number"
placeholder="Parcelas"
value={parcelas}
onChange={e=>setParcelas(Number(e.target.value))}
min="1"
/>

<br/><br/>

<div style={{marginBottom:20}}>
<strong>Total:</strong> R$ {valorTotal.toFixed(2)}
<br/>
<strong>Comissão:</strong> R$ {comissao.toFixed(2)}
<br/>
<strong>Valor da parcela:</strong> R$ {valorParcela.toFixed(2)}
</div>

<button onClick={salvarVenda}>
Salvar Venda
</button>

<hr/>

<h2>📋 Vendas</h2>

{vendas.map(v=>(

<div key={v.id} style={{
border:"1px solid #ccc",
padding:10,
borderRadius:6,
marginBottom:10
}}>

📅 {new Date(v.data_venda).toLocaleDateString("pt-BR")}

<br/>

R$ {Number(v.valor_total).toFixed(2)}

</div>

))}

</div>

);

}