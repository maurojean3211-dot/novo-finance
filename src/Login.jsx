import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onLogin }) {
  const [modo, setModo] = useState("login"); // login | cadastro
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  // ================= LOGIN =================
  async function entrar() {
    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

    setLoading(false);

    if (error) {
      if (
        error.message.includes("Invalid login credentials")
      ) {
        alert("Email ou senha incorretos.");
      } else {
        alert(error.message);
      }
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (typeof onLogin === "function") {
      onLogin(user);
    } else {
      window.location.reload();
    }
  }

  // ================= CADASTRO =================
  async function cadastrar() {
    if (!email || !senha || !cpf || !whatsapp) {
      alert("Preencha todos os campos");
      return;
    }

    setLoading(true);

    const emailLimpo = email.trim().toLowerCase();

    const { data, error } =
      await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
      });

    if (error) {
      setLoading(false);

      if (
        error.message.includes(
          "User already registered"
        )
      ) {
        alert(
          "Este email já está cadastrado. Faça login."
        );
        setModo("login");
        return;
      }

      alert(error.message);
      return;
    }

    if (data?.user) {
      const userId = data.user.id;

      const { data: empresa } =
        await supabase
          .from("empresas")
          .insert([
            {
              user_id: userId,
              name: emailLimpo,
              email: emailLimpo,
              cpf,
              whatsapp,
              plano: "Básico",
              status: "Ativo",
            },
          ])
          .select()
          .single();

      await supabase.from("usuarios").insert([
        {
          id: userId,
          email: emailLimpo,
          nome: emailLimpo,
          role: "cliente",
          empresa_id: empresa?.id,
        },
      ]);
    }

    setLoading(false);

    alert("Conta criada! Agora faça login.");
    setModo("login");
  }

  // ================= RECUPERAR SENHA =================
  async function recuperarSenha() {
    if (!email) {
      alert("Digite seu email");
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo:
            window.location.origin + "/reset",
        }
      );

    if (error) {
      alert("Erro ao enviar email");
    } else {
      alert("Email enviado!");
    }
  }

  return (
    <div style={container}>
      <div style={box}>
        <img
          src={window.location.origin + "/logo.png"}
          width={80}
          style={{ marginBottom: 10 }}
        />

        <h2>Cunha Finance</h2>

        <input
          style={input}
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          style={input}
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) =>
            setSenha(e.target.value)
          }
        />

        {modo === "cadastro" && (
          <>
            <input
              style={input}
              placeholder="CPF"
              value={cpf}
              onChange={(e) =>
                setCpf(e.target.value)
              }
            />

            <input
              style={input}
              placeholder="WhatsApp"
              value={whatsapp}
              onChange={(e) =>
                setWhatsapp(
                  e.target.value
                )
              }
            />
          </>
        )}

        {modo === "login" ? (
          <>
            <button
              style={botao}
              onClick={entrar}
              disabled={loading}
            >
              {loading
                ? "Aguarde..."
                : "Entrar"}
            </button>

            <button
              style={botaoSecundario}
              onClick={() =>
                setModo("cadastro")
              }
            >
              Criar Conta
            </button>

            <p
              style={esqueci}
              onClick={recuperarSenha}
            >
              🔑 Esqueci minha senha
            </p>
          </>
        ) : (
          <>
            <button
              style={botao}
              onClick={cadastrar}
              disabled={loading}
            >
              {loading
                ? "Aguarde..."
                : "Cadastrar"}
            </button>

            <button
              style={botaoSecundario}
              onClick={() =>
                setModo("login")
              }
            >
              Voltar para login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ===== ESTILO =====

const container = {
  background: "#020617",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "white",
};

const box = {
  width: "100%",
  maxWidth: 350,
  textAlign: "center",
  background: "#111827",
  padding: 25,
  borderRadius: 12,
};

const botao = {
  marginTop: 12,
  padding: 12,
  width: "100%",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoSecundario = {
  marginTop: 10,
  padding: 10,
  width: "100%",
  borderRadius: 8,
  border: "none",
  background: "#374151",
  color: "white",
  cursor: "pointer",
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  borderRadius: 6,
  border: "none",
};

const esqueci = {
  marginTop: 15,
  cursor: "pointer",
  color: "#60a5fa",
  fontWeight: "bold",
};