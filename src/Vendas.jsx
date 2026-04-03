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

// ================= INIT
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

if(error){
console.error("Erro empresa:", error);
return;
}

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

const { data,error } = await supabase
.from("empresas")
.select("pix_chave")
.eq("id",empresa_id)
.single();

if(error){
console.error("Erro PIX:", error);
return;
}

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

try{

if(!empresaId) return alert("Empresa não carregada");
if(!clienteNome) return alert("Informe o cliente");
if(qtd <= 0) return alert("Quantidade inválida");

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return alert("Usuário não autenticado");

// 🔥 DEBUG (AQUI VAI MOSTRAR O PROBLEMA REAL)
console.log("DEBUG ENVIO:", {
empresa_id: empresaId,
cliente_id: clienteId,
user_id: user?.id,
qtd,
valorTotal
});

// 🔥 CRIAR CLIENTE
let clienteFinalId = clienteId;

if(!clienteId){

const { data:novoCliente, error:erroCliente } = await supabase
.from("clientes")
.insert([{
nome: clienteNome,
empresa_id: empresaId
}])
.select()
.single();

if(erroCliente){
console.error("ERRO CLIENTE:", erroCliente);
alert("Erro cliente: " + erroCliente.message);
return;
}

clienteFinalId = novoCliente?.id;

}

// 🔥 GARANTIA FINAL
if(!clienteFinalId){
alert("Cliente inválido");
return;
}

// 🔥 SALVAR VENDA
const { data:venda, error } = await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_id:clienteFinalId,
produto: produtoId || null,
kilos:Number(qtd),
preco_unitario:Number(preco),
valor_total:Number(valorTotal),
comissao:Number(comissao),
data_venda:dataVenda,
user_id:user.id
}])
.select()
.single();

if(error){
console.error("ERRO COMPLETO VENDA:", error);
alert("Erro ao salvar venda:\n" + error.message);
return;
}

// 🔥 RECEBIMENTOS
let listaRecebimentos = [];

for(let i=1;i<=parcelas;i++){

let dataParcela = new Date(dataVenda);
dataParcela.setDate(dataParcela.getDate() + ((i-1)*30));

listaRecebimentos.push({
empresa_id: empresaId,
venda_id: venda.id,
cliente_id: clienteFinalId,
valor: Number((valorTotal / parcelas).toFixed(2)),
data_vencimento: dataParcela.toISOString().split("T")[0],
status: "pendente"
});
}

const { error:erroRec } = await supabase
.from("recebimentos")
.insert(listaRecebimentos);

if(erroRec){
console.error("ERRO RECEBIMENTOS:", erroRec);
}

// FINAL
alert("Venda salva com sucesso!");

setQuantidade("");
setPrecoUnitario("");
setParcelas(1);
setClienteNome("");
setClienteId("");
setProdutoId("");

buscarDados(empresaId);

}catch(err){
console.error("ERRO GERAL:", err);
alert("Erro inesperado: " + err.message);
}

}

// ================= TELA
return(

<div style={{padding:20}}>

<h1>🛒 Registrar Venda</h1>

<input
type="date"
value={dataVenda}
onChange={e=>setDataVenda(e.target.value)}
/>

<br/><br/>

<input
list="lista-clientes"
placeholder="Cliente"
value={clienteNome}
onChange={e=>{
setClienteNome(e.target.value);

const cliente = clientes.find(c=>c.nome === e.target.value);

if(cliente){
setClienteId(cliente.id);
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

<input
list="lista-produtos"
placeholder="Produto"
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
value={parcelas}
onChange={e=>setParcelas(Number(e.target.value))}
min="1"
/>

<br/><br/>

<div>
Total: R$ {valorTotal.toFixed(2)} <br/>
Comissão: R$ {comissao.toFixed(2)}
</div>

<br/>

<button onClick={salvarVenda}>
Salvar Venda
</button>

<hr/>

{vendas.map(v=>(

<div key={v.id}>

{new Date(v.data_venda).toLocaleDateString("pt-BR")}  
R$ {Number(v.valor_total).toFixed(2)}

</div>

))}

</div>

);

}