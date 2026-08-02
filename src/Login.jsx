import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

const destaques = [
  ["01", "Catálogo Inteligente", "Produtos técnicos organizados para vender melhor."],
  ["02", "Orçamento Inteligente", "Propostas consistentes, rápidas e rastreáveis."],
  ["03", "Painel Executivo", "Indicadores comerciais em uma visão objetiva."],
  ["04", "IA Comercial", "Pendências e oportunidades em evidência."],
  ["05", "Dólar e LME", "Indicadores de mercado para decisões responsáveis."],
];

export default function Login({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  function exibirMensagem(tipo, texto) {
    setMensagem({ tipo, texto });
  }

  async function entrar(event) {
    event?.preventDefault();
    setMensagem(null);

    if (!email || !senha) {
      exibirMensagem("erro", "Preencha o e-mail e a senha para continuar.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    setLoading(false);

    if (error) {
      exibirMensagem(
        "erro",
        error.message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos. Confira os dados informados."
          : error.message,
      );
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (typeof onLogin === "function") onLogin(user);
    else window.location.reload();
  }

  async function cadastrar(event) {
    event?.preventDefault();
    setMensagem(null);

    if (!email || !senha || !cpf || !whatsapp) {
      exibirMensagem("erro", "Preencha todos os campos para criar a conta.");
      return;
    }

    setLoading(true);
    const emailLimpo = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({ email: emailLimpo, password: senha });

    if (error) {
      setLoading(false);
      if (error.message.includes("User already registered")) {
        exibirMensagem("erro", "Este e-mail já está cadastrado. Faça login para continuar.");
        setModo("login");
        return;
      }
      exibirMensagem("erro", error.message);
      return;
    }

    if (data?.user) {
      const userId = data.user.id;
      const { data: empresa } = await supabase.from("empresas").insert([{
        user_id: userId,
        name: emailLimpo,
        email: emailLimpo,
        cpf,
        whatsapp,
        plano: "Básico",
        status: "Ativo",
      }]).select().single();

      await supabase.from("usuarios").insert([{
        id: userId,
        email: emailLimpo,
        nome: emailLimpo,
        role: "cliente",
        empresa_id: empresa?.id,
      }]);
    }

    setLoading(false);
    exibirMensagem("sucesso", "Conta criada. Agora você já pode fazer login.");
    setModo("login");
  }

  async function recuperarSenha() {
    setMensagem(null);
    if (!email) {
      exibirMensagem("erro", "Digite seu e-mail para recuperar o acesso.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: window.location.origin + "/reset" },
    );
    setLoading(false);

    exibirMensagem(
      error ? "erro" : "sucesso",
      error ? "Não foi possível enviar o e-mail de recuperação." : "E-mail de recuperação enviado.",
    );
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase__glow" />
        <div className="login-brand"><span>CF</span><div><strong>Cunha Finance</strong><small>Gestão inteligente</small></div></div>

        <div className="login-presentation">
          <p className="login-eyebrow">Plataforma inteligente de gestão comercial</p>
          <h1>Decisões mais inteligentes para o mercado do alumínio.</h1>
          <p className="login-description">Gerencie vendas, estoque, catálogo inteligente, orçamentos, CRM, financeiro e indicadores de mercado em uma única plataforma.</p>

          <div className="industry-visual" aria-hidden="true">
            <div className="industry-visual__grid" />
            <div className="aluminum-profile aluminum-profile--one" />
            <div className="aluminum-profile aluminum-profile--two" />
            <div className="industry-visual__metric"><span>Visão integrada</span><strong>Comercial + Operação</strong><small>Dados seguros para decisões melhores</small></div>
          </div>

          <div className="login-features">
            {destaques.map(([numero, titulo, descricao]) => (
              <div key={titulo}><span>{numero}</span><p><strong>{titulo}</strong><small>{descricao}</small></p></div>
            ))}
          </div>
        </div>

        <footer><span>Feito para empresas que transformam alumínio em resultado.</span><b>Seguro · Modular · Multiempresa</b></footer>
      </section>

      <section className="login-access">
        <div className="login-card">
          <div className="login-card__logo"><img src={`${window.location.origin}/logo.png`} alt="Cunha Finance" /><span>CF</span></div>
          <div className="login-card__heading"><span>Acesso seguro</span><h2>{modo === "login" ? "Bem-vindo de volta" : "Criar sua conta"}</h2><p>{modo === "login" ? "Entre com seus dados para acessar a plataforma." : "Preencha os dados para iniciar seu acesso."}</p></div>

          {mensagem && <div className={`login-message login-message--${mensagem.tipo}`} role="status">{mensagem.texto}</div>}

          <form onSubmit={modo === "login" ? entrar : cadastrar}>
            <label className="login-field"><span>E-mail</span><div><b>@</b><input type="email" autoComplete="email" placeholder="seuemail@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} /></div></label>
            <label className="login-field"><span>Senha</span><div><b>●</b><input type="password" autoComplete={modo === "login" ? "current-password" : "new-password"} placeholder="Digite sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={loading} /></div></label>

            {modo === "cadastro" && <div className="register-fields">
              <label className="login-field"><span>CPF</span><div><b>▣</b><input inputMode="numeric" autoComplete="off" placeholder="Informe seu CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={loading} /></div></label>
              <label className="login-field"><span>WhatsApp</span><div><b>◉</b><input inputMode="tel" autoComplete="tel" placeholder="Informe seu WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={loading} /></div></label>
            </div>}

            {modo === "login" && <div className="login-options"><label><input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> <span>Lembrar acesso</span></label><button type="button" onClick={recuperarSenha} disabled={loading}>Esqueci minha senha</button></div>}

            <button className="login-submit" type="submit" disabled={loading}>{loading ? <><span className="login-spinner" /> Aguarde...</> : modo === "login" ? "Entrar na plataforma →" : "Criar conta →"}</button>
            <button className="login-secondary" type="button" onClick={() => { setModo(modo === "login" ? "cadastro" : "login"); setMensagem(null); }} disabled={loading}>{modo === "login" ? "Criar uma nova conta" : "Voltar para o login"}</button>
          </form>

          <div className="login-security"><span>◆</span><p><strong>Ambiente protegido</strong><small>Seus dados de acesso são processados com segurança.</small></p></div>
        </div>
        <footer className="login-footer"><span>© 2026 Cunha Finance</span><span>Versão 1.0 · Sprint visual</span></footer>
      </section>
    </main>
  );
}
