import { useState } from "react";
import { supabase } from "./supabase";

export default function Cadastro(){

const [nome,setNome]=useState("");
const [email,setEmail]=useState("");
const [cpf,setCpf]=useState("");
const [whatsapp,setWhatsapp]=useState("");
const [senha,setSenha]=useState("");

async function criarConta(){

const { data, error } = await supabase.auth.signUp({
email: email,
password: senha,
options: { data: { nome: email, empresa_nome: nome, cpf, whatsapp } }
});

if(error){
alert(error.message);
return;
}

if(data.session) await supabase.auth.signOut({ scope: "local" });
alert("Cadastro recebido. Aguarde a aprovação administrativa.");

}

return(

<div style={{padding:40}}>

<h2>Criar Conta</h2>

<input
placeholder="Nome da empresa"
value={nome}
onChange={e=>setNome(e.target.value)}
/>

<input
placeholder="Email"
value={email}
onChange={e=>setEmail(e.target.value)}
/>

<input
placeholder="CPF ou CNPJ"
value={cpf}
onChange={e=>setCpf(e.target.value)}
/>

<input
placeholder="WhatsApp"
value={whatsapp}
onChange={e=>setWhatsapp(e.target.value)}
/>

<input
placeholder="Senha"
type="password"
value={senha}
onChange={e=>setSenha(e.target.value)}
/>

<button onClick={criarConta}>
Criar Conta
</button>

</div>

);

}
