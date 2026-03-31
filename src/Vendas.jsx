import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";

export default function Vendas(){

const [clientes,setClientes] = useState([]);
const [produtos,setProdutos] = useState([]);
const [vendas,setVendas] = useState([]);

const [clienteId,setClienteId] = useState("");
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

useEffect(()=>{
buscarEmpresa();
},[]);

// ================= BUSCAR EMPRESA

async function buscarEmpresa(){

const { data:{ user } } = await supabase.auth.getUser();

if(!user) return;

const { data,error } = await supabase
.from("usuarios")
.select("empresa_id")
.eq("id",user.id)
.single();

if(error){
console.log("Erro usuario:",error);
return;
}

if(!data?.empresa_id){
console.log("Empresa não encontrada");
return;
}

setEmpresaId(data.empresa_id);

buscarPix(data.empresa_id);
buscarDados(data.empresa_id);

}

// ================= BUSCAR PIX

async function buscarPix(empresa_id){

const { data,error } = await supabase
.from("empresas")
.select("pix_chave")
.eq("id",empresa_id)
.single();

if(error){
console.log("Erro PIX:",error);
return;
}

if(data){
setPixEmpresa(data.pix_chave || "");
}

}

// ================= BUSCAR DADOS

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

// ================= SELECIONAR PRODUTO

function selecionarProduto(id){
setProdutoId(id);
}

// ================= SELECIONAR CLIENTE

function selecionarCliente(id){

setClienteId(id);

const cliente = clientes.find(c=>c.id == id);

if(cliente){
setClienteWhatsapp(cliente.whatsapp || "");
}

}

// ================= CALCULOS

const qtd = parseFloat(quantidade) || 0;
const preco = parseFloat(precoUnitario) || 0;

const valorTotal = preco * qtd;

const valorParcela = parcelas > 0 ? valorTotal / parcelas : valorTotal;

// ================= TEXTO PIX PARA QR CODE

const textoPix = pixEmpresa && valorTotal > 0
? `PIX\nChave:${pixEmpresa}\nValor:${valorTotal.toFixed(2)}`
: "";

// ================= SALVAR VENDA

async function salvarVenda(){

if(!empresaId){
alert("Empresa não carregada");
return;
}

if(!clienteId){
alert("Selecione um cliente");
return;
}

if(qtd <= 0){
alert("Quantidade inválida");
return;
}

const { data:{ user } } = await supabase.auth.getUser();

const { error } = await supabase
.from("vendas")
.insert([{
empresa_id:empresaId,
cliente_id:clienteId,
produto_id:produtoId || null,
kilos:qtd,
preco_unitario:preco,
valor_total:valorTotal,
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

buscarDados(empresaId);

}

// ================= WHATSAPP

function enviarWhatsapp(venda){

if(!clienteWhatsapp){
alert("Cliente não possui WhatsApp cadastrado");
return;
}

const mensagem = encodeURIComponent(
`Olá!

Compra registrada no sistema Cunha Finance.

Valor: R$ ${Number(venda.valor_total).toFixed(2)}

Pagamento via PIX:
${pixEmpresa}`
);

window.open(`https://wa.me/55${clienteWhatsapp}?text=${mensagem}`);

}

// ================= FORMATAR DATA

function formatarData(data){
return new Date(data).toLocaleDateString("pt-BR");
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

<select
value={clienteId}
onChange={e=>selecionarCliente(e.target.value)}

>

<option value="">Cliente</option>
{clientes.map(c=>(
<option key={c.id} value={c.id}>{c.nome}</option>
))}
</select>

<br/><br/>

<select
value={produtoId}
onChange={e=>selecionarProduto(e.target.value)}

>

<option value="">Produto</option>
{produtos.map(p=>(
<option key={p.id} value={p.id}>{p.nome}</option>
))}
</select>

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
<strong>Valor da parcela:</strong> R$ {valorParcela.toFixed(2)}
</div>

{/* PIX */}

<div style={{textAlign:"center",marginBottom:20}}>

<h3>Pagamento via PIX</h3>

<input
value={pixEmpresa || "Chave PIX não cadastrada"}
readOnly
style={{
padding:"10px",
width:"300px",
textAlign:"center"
}}
/>

<br/><br/>

{textoPix && (

<QRCodeCanvas
value={textoPix}
size={220}
/>

)}

<br/><br/>

<button
onClick={()=>navigator.clipboard.writeText(pixEmpresa)}
style={{
background:"#16a34a",
color:"#fff",
border:"none",
padding:"8px 16px",
borderRadius:"6px"
}}

>

Copiar chave PIX </button>

</div>

<button onClick={salvarVenda}>
Salvar Venda
</button>

<hr/>

<h2>📋 Vendas</h2>

{vendas.map(v=>(

<div
key={v.id}
style={{
border:"1px solid #ccc",
padding:10,
borderRadius:6,
marginBottom:10
}}
>

📅 {formatarData(v.data_venda)}

<br/>

R$ {Number(v.valor_total).toFixed(2)}

<br/>

<button
onClick={()=>enviarWhatsapp(v)}
style={{
marginTop:6,
background:"#22c55e",
color:"#fff",
border:"none",
padding:"6px 12px"
}}

>

📲 Enviar WhatsApp </button>

</div>

))}

</div>

);

}
