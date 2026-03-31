import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Produtos() {

const [produtos,setProdutos]=useState([]);
const [nome,setNome]=useState("");
const [comissao,setComissao]=useState("0.05");

const [empresaId,setEmpresaId] = useState(null);

useEffect(()=>{
iniciar();
},[]);

async function iniciar(){

```
const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

const { data } = await supabase
  .from("usuarios")
  .select("empresa_id")
  .eq("id",user.id)
  .single();

if(data){
  setEmpresaId(data.empresa_id);
  carregarProdutos(data.empresa_id);
}
```

}

// ================= CARREGAR PRODUTOS
async function carregarProdutos(empresa_id){

```
const {data,error} = await supabase
  .from("produtos")
  .select("*")
  .eq("empresa_id",empresa_id)
  .order("data_cadastro",{ascending:false});

if(error){
  console.log(error);
  return;
}

setProdutos(data || []);
```

}

// ================= AUTO DEFINIR COMISSÃO
function alterarNome(valor){

```
setNome(valor);

const texto = valor.toLowerCase();

if(texto.includes("cavaco")){
  setComissao("0.07");
} else if(texto.includes("sucata")){
  setComissao("0.05");
}
```

}

// ================= SALVAR PRODUTO
async function salvarProduto(){

```
if(!nome.trim()){
  alert("Informe o nome do produto");
  return;
}

const { data:{ user } } = await supabase.auth.getUser();
if(!user) return;

const {error} = await supabase
  .from("produtos")
  .insert([{
    empresa_id:empresaId,
    nome: nome.trim(),
    comissao: Number(comissao),
    data_cadastro: new Date().toISOString().split("T")[0],
    user_id:user.id
  }]);

if(error){
  console.log(error);
  alert(error.message);
  return;
}

setNome("");
setComissao("0.05");

carregarProdutos(empresaId);
```

}

// ================= EXCLUIR
async function excluirProduto(id){

```
if(!window.confirm("Excluir produto?")) return;

const {error} = await supabase
  .from("produtos")
  .delete()
  .eq("id",id)
  .eq("empresa_id",empresaId);

if(error){
  console.log(error);
  alert("Erro ao excluir");
  return;
}

carregarProdutos(empresaId);
```

}

// ================= FORMATAR DATA
function formatarData(data){
if(!data) return "";
return new Date(data).toLocaleDateString("pt-BR");
}

// ================= TELA
return( <div style={{padding:20}}>

```
  <h1>📦 Produtos</h1>

  <input
    placeholder="Ex: Sucata Latinha ou Cavaco"
    value={nome}
    onChange={e=>alterarNome(e.target.value)}
  />

  <br/><br/>

  <select
    value={comissao}
    onChange={e=>setComissao(e.target.value)}
  >
    <option value="0.05">
      Sucata (Latinha / Perfil / Panela / Chaparia) — R$ 0,05
    </option>

    <option value="0.07">
      Cavaco — R$ 0,07
    </option>
  </select>

  <br/><br/>

  <button onClick={salvarProduto}>
    Salvar Produto
  </button>

  <hr/>

  {produtos.map(p=>(
    <div
      key={p.id}
      style={{
        marginBottom:12,
        padding:15,
        border:"1px solid #374151",
        borderRadius:8,
        background:"#020617"
      }}
    >
      📅 {formatarData(p.data_cadastro)}

      <div style={{fontSize:18,fontWeight:"bold"}}>
        {p.nome}
      </div>

      💰 Comissão: R$ {Number(p.comissao || 0).toFixed(2)} / kg

      <br/>

      <button
        onClick={()=>excluirProduto(p.id)}
        style={{
          marginTop:8,
          background:"#dc2626",
          color:"#fff",
          border:"none",
          padding:"5px 10px",
          cursor:"pointer"
        }}
      >
        Excluir
      </button>
    </div>
  ))}

</div>
```

);
}
