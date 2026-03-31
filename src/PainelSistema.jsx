import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function PainelSistema(){

  const [usuarios,setUsuarios] = useState([]);

  useEffect(()=>{
    carregarUsuarios();
  },[]);

  async function carregarUsuarios(){

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .order("created_at",{ascending:false});

    setUsuarios(data || []);
  }

  // 🔥 ALTERAR PIX LOCAL
  function alterarPix(id, valor){

    setUsuarios(prev =>
      prev.map(u =>
        u.id === id ? { ...u, pix: valor } : u
      )
    );
  }

  // 🔥 SALVAR PIX NO BANCO
  async function salvarPix(id, pix){

    const { error } = await supabase
      .from("usuarios")
      .update({ pix })
      .eq("id", id);

    if(error){
      console.log(error);
      alert("Erro ao salvar PIX");
      return;
    }

    alert("✅ PIX salvo!");
  }

  return(

    <div style={{padding:20,color:"#fff"}}>

      <h1>👑 Usuários do Sistema</h1>

      <table style={{width:"100%",marginTop:20}}>

        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>PIX</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>

          {usuarios.map(u=>(

            <tr key={u.id}>

              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status}</td>

              {/* 🔥 CAMPO PIX */}
              <td>
                <input
                  value={u.pix || ""}
                  onChange={(e)=>alterarPix(u.id, e.target.value)}
                  style={inputStyle}
                  placeholder="Digite o PIX"
                />
              </td>

              {/* 🔥 BOTÃO SALVAR */}
              <td>
                <button
                  onClick={()=>salvarPix(u.id, u.pix)}
                  style={botao}
                >
                  💾 Salvar
                </button>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}

// 🎨 estilos

const inputStyle={
  padding:6,
  borderRadius:6,
  border:"none"
};

const botao={
  padding:6,
  borderRadius:6,
  border:"none",
  background:"#22c55e",
  color:"#fff",
  cursor:"pointer"
};