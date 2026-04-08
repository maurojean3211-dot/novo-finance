import { useEffect, useState } from "react";
import { supabase } from "./supabase";

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

import Vendas from "./Vendas.jsx";
import Compras from "./Compras.jsx";

import Emprestimos from "./Emprestimos.jsx";
import Atrasos from "./Atrasos.jsx";
import EmprestimosLista from "./EmprestimosLista.jsx";

export default function App(){

const [session,setSession] = useState(null);
const [loadingSession,setLoadingSession] = useState(true);
const [pagina,setPagina] = useState("dashboard");
const [subPaginaEmprestimo,setSubPaginaEmprestimo] = useState("cadastro");

const [role,setRole] = useState(null);
const [empresaId,setEmpresaId] = useState(null);
const [isMobile,setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const splash = document.getElementById("splash");
  if (splash) splash.style.display = "none";
}, []);

useEffect(()=>{
  function handleResize(){
    setIsMobile(window.innerWidth < 768);
  }
  window.addEventListener("resize",handleResize);
  return ()=> window.removeEventListener("resize",handleResize);
},[]);

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
.ilike("email", user.email);

usuario = usuario?.[0];

console.log("EMAIL:", user.email);
console.log("USUARIO BANCO:", usuario);
console.log("ROLE:", usuario?.role);

setEmpresaId(usuario?.empresa_id || null); // 🔥 GARANTIDO
setRole(usuario?.role || null);

}

}catch(err){
console.log(err);
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
.ilike("email", newSession.user.email);

usuario = usuario?.[0];

console.log("SESSION EMAIL:", newSession.user.email);
console.log("USUARIO BANCO:", usuario);
console.log("ROLE:", usuario?.role);

setEmpresaId(usuario?.empresa_id || null);
setRole(usuario?.role || null);

}
});

return ()=> subscription?.unsubscribe();

},[]);

async function sair(){
  await supabase.auth.signOut();
  setSession(null);
}

if(loadingSession){
return <div style={{color:"#fff",padding:20}}>Carregando...</div>;
}

if(!session){
return <Login />;
}

const isMauro = session?.user?.email === "maurojean3211@gmail.com";

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
padding:15,
display:"flex",
flexDirection:"column",
gap:10
}}>

<div style={{display:"flex",alignItems:"center",gap:10}}>
<img src="/logo.png" width={40} />
<h2>Cunha Finance</h2>
</div>

<button onClick={()=>setPagina("dashboard")} style={pagina==="dashboard" ? botaoAtivo : botaoMenu}>📊 Dashboard</button>
<button onClick={()=>setPagina("financeiro")} style={pagina==="financeiro" ? botaoAtivo : botaoMenu}>💰 Financeiro</button>
<button onClick={()=>setPagina("recebimentos")} style={pagina==="recebimentos" ? botaoAtivo : botaoMenu}>💰 Recebimentos</button>
<button onClick={()=>setPagina("clientes")} style={pagina==="clientes" ? botaoAtivo : botaoMenu}>👥 Clientes</button>

<button onClick={()=>setPagina("emprestimos")} style={pagina==="emprestimos" ? botaoAtivo : botaoMenu}>
💸 Empréstimos
</button>

{/* 👑 MASTER */}
{role === "master" && (
<button onClick={()=>setPagina("master")} style={pagina==="master" ? botaoAtivo : botaoMenu}>
👑 Master Admin
</button>
)}

{/* ADMIN */}
{role === "admin" && (
<button onClick={()=>setPagina("lucro")} style={pagina==="lucro" ? botaoAtivo : botaoMenu}>📈 Lucro</button>
)}

{/* EXTRA */}
{isMauro && (
<>
<button onClick={()=>setPagina("vendas")} style={pagina==="vendas" ? botaoAtivo : botaoMenu}>📦 Vendas</button>
<button onClick={()=>setPagina("compras")} style={pagina==="compras" ? botaoAtivo : botaoMenu}>🧱 Compras</button>
</>
)}

<button onClick={()=>setPagina("despesas")} style={pagina==="despesas" ? botaoAtivo : botaoMenu}>💳 Pessoal</button>
<button onClick={()=>setPagina("relatorio")} style={pagina==="relatorio" ? botaoAtivo : botaoMenu}>📄 Relatórios</button>

<button onClick={sair} style={{...botaoMenu, background:"#ef4444"}}>
🚪 Sair
</button>

</div>

{/* CONTEÚDO */}
<div style={{flex:1,padding:20}}>

{pagina==="dashboard" && <Dashboard />}
{pagina==="financeiro" && <Financeiro empresaId={empresaId} />}
{pagina==="recebimentos" && <Recebimentos empresaId={empresaId} />}
{pagina==="clientes" && <Clientes />}

{pagina==="emprestimos" && (
  <div>

    <h2>💸 Empréstimos</h2>

    <div style={{display:"flex",gap:10,marginBottom:20}}>
      <button onClick={()=>setSubPaginaEmprestimo("cadastro")} style={botaoMenu}>➕ Novo</button>
      <button onClick={()=>setSubPaginaEmprestimo("lista")} style={botaoMenu}>📋 Cobrança</button>
      <button onClick={()=>setSubPaginaEmprestimo("atrasos")} style={botaoMenu}>🚨 Atrasos</button>
    </div>

    {subPaginaEmprestimo==="cadastro" && <Emprestimos empresaId={empresaId} />}
    {subPaginaEmprestimo==="lista" && <EmprestimosLista empresaId={empresaId} />}
    {subPaginaEmprestimo==="atrasos" && <Atrasos empresaId={empresaId} />}

  </div>
)}

{pagina==="lucro" && role==="admin" && <Lucro />}

{pagina==="vendas" && isMauro && <Vendas empresaId={empresaId} />}
{pagina==="compras" && isMauro && <Compras empresaId={empresaId} />}

{pagina==="despesas" && <DespesasPessoais />}
{pagina==="relatorio" && <Relatorio empresaId={empresaId} />}
{pagina==="admin" && <Admin />}
{pagina==="master" && role==="master" && <MasterAdmin />}

</div>

</div>
);
}

const botaoMenu={
width:"100%",
padding:10,
background:"#111827",
color:"#fff",
border:"none",
borderRadius:6,
cursor:"pointer"
};

const botaoAtivo={
width:"100%",
padding:10,
background:"#2563eb",
color:"#fff",
border:"none",
borderRadius:6,
cursor:"pointer"
};