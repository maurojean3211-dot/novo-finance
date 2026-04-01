import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// 🔥 GARANTE CSS NO BUILD
import "./index.css";

import Login from "./Login";
import Admin from "./Admin";
import Dashboard from "./Dashboard";
import MasterAdmin from "./MasterAdmin";
import Financeiro from "./Financeiro.jsx";
import Lucro from "./Lucro.jsx";
import DespesasPessoais from "./DespesasPessoais.jsx";
import Relatorio from "./Relatorio.jsx";
import Clientes from "./Clientes.jsx";
import Recebimentos from "./Recebimentos.jsx";

// 🔥 NOVOS
import Vendas from "./Vendas.jsx";
import Compras from "./Compras.jsx";

export default function App(){

const [session,setSession] = useState(null);
const [loadingSession,setLoadingSession] = useState(true);
const [pagina,setPagina] = useState("dashboard");
const [role,setRole] = useState(null);
const [empresaId,setEmpresaId] = useState(null);
const [isMobile,setIsMobile] = useState(window.innerWidth < 768);

// 🔥 REMOVE SPLASH
useEffect(() => {
  const splash = document.getElementById("splash");
  if (splash) splash.style.display = "none";
}, []);

// RESPONSIVO
useEffect(()=>{
  function handleResize(){
    setIsMobile(window.innerWidth < 768);
  }
  window.addEventListener("resize",handleResize);
  return ()=> window.removeEventListener("resize",handleResize);
},[]);

// SESSÃO
useEffect(()=>{

async function carregarSessao(){

try{

const { data } = await supabase.auth.getUser();
const user = data?.user || null;

setSession(user ? { user } : null);

if(user){

let { data:usuario } = await supabase
.from("usuarios")
.select("role,empresa_id")
.eq("id",user.id)
.maybeSingle();

if(usuario?.empresa_id){
  setEmpresaId(usuario.empresa_id);
}

setRole(usuario?.role || "cliente");

}

}catch(err){
console.log("Erro sessão:",err);
} finally {
setLoadingSession(false);
}

}

carregarSessao();

const { data:{ subscription } } =
supabase.auth.onAuthStateChange(async (_event,newSession)=>{

setSession(newSession);

if(newSession?.user){

let { data:usuario } = await supabase
.from("usuarios")
.select("role,empresa_id")
.eq("id",newSession.user.id)
.maybeSingle();

if(usuario?.empresa_id){
  setEmpresaId(usuario.empresa_id);
}

setRole(usuario?.role || "cliente");

}

});

return ()=>{
subscription?.unsubscribe();
};

},[]);

// 🔥 LOGOUT
async function sair(){
  await supabase.auth.signOut();
  setSession(null);
}

// LOADING
if(loadingSession){
return <div style={{color:"#fff",padding:20}}>Iniciando sistema...</div>;
}

// LOGIN
if(!session){
return <Login />;
}

// EMPRESA
if(session && empresaId === null){
return (
<div style={{color:"#fff",padding:20}}>
Carregando empresa... (aguarde)
</div>
);
}

// 🔥 IDENTIFICA SE É VOCÊ
const isMauro = session?.user?.email === "maurojean3211@gmail.com";

// APP
return(

<div style={{
display:"flex",
flexDirection: isMobile ? "column" : "row",
width:"100%",
minHeight:"100vh",
background:"#020617",
color:"#fff"
}}>

{/* MENU */}
<div style={{
width: isMobile ? "100%" : 230,
background:"#020617",
borderRight: isMobile ? "none" : "1px solid #1e293b",
borderBottom: isMobile ? "1px solid #1e293b" : "none",
padding:15,
display:"flex",
flexDirection: isMobile ? "row" : "column",
flexWrap: isMobile ? "wrap" : "nowrap",
gap:10
}}>

{/* LOGO */}
<div style={{
display:"flex",
alignItems:"center",
gap:10,
marginBottom:10,
width:"100%"
}}>
<img src="/logo.png" width={40} />
<h2 style={{margin:0}}>Cunha Finance</h2>
</div>

<button onClick={()=>setPagina("dashboard")} style={pagina==="dashboard" ? botaoAtivo : botaoMenu}>
📊 Dashboard
</button>

<button onClick={()=>setPagina("financeiro")} style={pagina==="financeiro" ? botaoAtivo : botaoMenu}>
💰 Financeiro
</button>

<button onClick={()=>setPagina("recebimentos")} style={pagina==="recebimentos" ? botaoAtivo : botaoMenu}>
💰 Recebimentos
</button>

<button onClick={()=>setPagina("clientes")} style={pagina==="clientes" ? botaoAtivo : botaoMenu}>
👥 Clientes
</button>

{role === "admin" && (
<button onClick={()=>setPagina("lucro")} style={pagina==="lucro" ? botaoAtivo : botaoMenu}>
📈 Lucro
</button>
)}

{/* 🔥 NOVO MENU SÓ PRA VOCÊ */}
{isMauro && (
<>
<button onClick={()=>setPagina("vendas")} style={pagina==="vendas" ? botaoAtivo : botaoMenu}>
📦 Vendas
</button>

<button onClick={()=>setPagina("compras")} style={pagina==="compras" ? botaoAtivo : botaoMenu}>
🧱 Compras
</button>
</>
)}

<button onClick={()=>setPagina("despesas")} style={pagina==="despesas" ? botaoAtivo : botaoMenu}>
💳 Pessoal
</button>

<button onClick={()=>setPagina("relatorio")} style={pagina==="relatorio" ? botaoAtivo : botaoMenu}>
📄 Relatórios
</button>

<button onClick={()=>setPagina("admin")} style={pagina==="admin" ? botaoAtivo : botaoMenu}>
⚙ Sistema
</button>

{role === "admin" && (
<button onClick={()=>setPagina("master")} style={pagina==="master" ? botaoAtivo : botaoMenu}>
👑 Master Admin
</button>
)}

<button onClick={sair} style={{...botaoMenu, background:"#ef4444"}}>
🚪 Sair
</button>

</div>

{/* CONTEÚDO */}
<div style={{
flex:1,
padding:20
}}>

{pagina==="dashboard" && <Dashboard />}
{pagina==="financeiro" && <Financeiro empresaId={empresaId} />}
{pagina==="recebimentos" && <Recebimentos empresaId={empresaId} />}
{pagina==="clientes" && <Clientes />}
{pagina==="lucro" && role==="admin" && <Lucro />}

{/* 🔥 NOVAS TELAS */}
{pagina==="vendas" && isMauro && <Vendas empresaId={empresaId} />}
{pagina==="compras" && isMauro && <Compras empresaId={empresaId} />}

{pagina==="despesas" && <DespesasPessoais />}
{pagina==="relatorio" && <Relatorio empresaId={empresaId} />}
{pagina==="admin" && <Admin />}
{pagina==="master" && role==="admin" && <MasterAdmin />}

</div>

</div>

);

}

// ESTILOS
const botaoMenu={
display:"block",
width:"100%",
padding:10,
background:"#111827",
color:"#fff",
border:"none",
borderRadius:6,
cursor:"pointer"
};

const botaoAtivo={
display:"block",
width:"100%",
padding:10,
background:"#2563eb",
color:"#fff",
border:"none",
borderRadius:6,
cursor:"pointer"
};