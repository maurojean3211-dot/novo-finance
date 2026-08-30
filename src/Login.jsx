import { useState } from "react";
import { authErrorMessage } from "./app/auth/authMessages";
import { supabase } from "./supabase";
import { formatMarketValue, marketQuoteDetail, useMarketData } from "./marketData";
import "./Login.css";

const destaques = [
  ["01", "Gestão Comercial", "Vendas, CRM, estoque e operação integrados."],
  ["02", "Financeiro Empresarial", "Contas e resultados em uma visão objetiva."],
  ["03", "Controle Financeiro Pessoal", "Receitas, despesas, metas e investimentos."],
  ["04", "Segurança dos Dados", "Acesso protegido para suas informações."],
  ["05", "Multiempresa", "Empresas e contextos organizados na plataforma."],
  ["06", "Mercado Livre de Energia", "Análise e oportunidades para redução e gestão do custo de energia."],
  ["07", "Energia Solar / Geração Distribuída", "Soluções para empresas, residências e consumidores de baixa tensão."],
  ["08", "Representações", "Acessórios para cortinas, produtos De Victor, insumos industriais, perfis e tarugos exclusivamente de alumínio."],
];

export default function Login({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const { quotes: indicadoresMercado } = useMarketData();

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

    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
      if (error) throw error;
      if (typeof onLogin === "function") onLogin(data.user);
    } catch (error) {
      exibirMensagem("erro", authErrorMessage(error, "Não foi possível entrar. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  async function cadastrar(event) {
    event?.preventDefault();
    setMensagem(null);

    if (!email || !senha || !cpf || !whatsapp || !empresaNome.trim()) {
      exibirMensagem("erro", "Preencha todos os campos para criar a conta.");
      return;
    }

    if (loading) return;
    setLoading(true);
    const emailLimpo = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({ email: emailLimpo, password: senha, options: { data: { nome: emailLimpo, empresa_nome: empresaNome.trim(), cpf: cpf.trim(), whatsapp: whatsapp.trim() } } });
      if (error) throw error;

      const authenticatedUser = data?.session?.user;
      if (!authenticatedUser || authenticatedUser.id !== data?.user?.id) {
        exibirMensagem(
          "sucesso",
          "Confirme seu e-mail. Depois, o cadastro permanecerá pendente até a aprovação administrativa."
        );
        setModo("login");
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      exibirMensagem("sucesso", "Cadastro recebido e pendente de aprovação administrativa.");
      setModo("login");
    } catch (error) {
      if (error.message?.includes("User already registered")) {
        exibirMensagem("erro", "Este e-mail já está cadastrado. Faça login para continuar.");
        setModo("login");
      } else {
        exibirMensagem("erro", authErrorMessage(error, error.message || "Não foi possível concluir a criação da conta."));
      }
    } finally {
      setLoading(false);
    }
  }

  async function recuperarSenha() {
    setMensagem(null);
    if (!email) {
      exibirMensagem("erro", "Digite seu e-mail para recuperar o acesso.");
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
      if (error) throw error;
      exibirMensagem("sucesso", "Se o e-mail estiver cadastrado, enviaremos um link de recuperação.");
    } catch (error) {
      exibirMensagem("erro", authErrorMessage(error, "Não foi possível enviar a recuperação agora."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase__glow" />
        <div className="login-brand">
          <span className="login-brand__mark" aria-hidden="true"><img src="/cunha-c-premium.png" alt="" /></span>
          <div><strong>Cunha Finance</strong><small>Gestão inteligente</small></div>
        </div>

        <div className="login-presentation">
          <p className="login-eyebrow">Gestão empresarial, pessoal e novas oportunidades</p>
          <h1>Gestão inteligente para sua empresa, suas finanças e novas oportunidades.</h1>
          <p className="login-description">Financeiro, vendas, compras, estoque, produção, CRM, finanças pessoais, soluções em energia e representações em um único ecossistema.</p>

          <div className="login-signature" aria-hidden="true">
            <span className="login-signature__halo" />
            <img src="/cunha-c-premium.png" alt="" />
          </div>

          <div className="industry-visual" aria-hidden="true">
            <div className="industry-visual__grid" />
            <div className="aluminum-profile aluminum-profile--one" />
            <div className="aluminum-profile aluminum-profile--two" />
            <div className="industry-visual__metric"><span>Visão integrada</span><strong>Comercial + Operação</strong><small>Dados seguros para decisões melhores</small></div>
          </div>

          <div className="login-market" aria-label="Indicadores de mercado">
            {indicadoresMercado.map((indicador) => (
              <article key={indicador.pair}>
                <span aria-hidden="true">{indicador.icon}</span>
                <p><strong>{indicador.name}</strong><small>{indicador.pair}</small></p>
                <em title={indicador.source ?? indicador.error ?? undefined}>{formatMarketValue(indicador) ?? marketQuoteDetail(indicador)}{indicador.status === "available" && ` · ${marketQuoteDetail(indicador)}`}</em>
              </article>
            ))}
          </div>

          <div className="login-features">
            {destaques.map(([numero, titulo, descricao]) => (
              <div key={titulo}><span>{numero}</span><p><strong>{titulo}</strong><small>{descricao}</small></p></div>
            ))}
          </div>
        </div>

        <footer><span>Gestão Empresarial · Finanças Pessoais · Energia · Representações.</span><b>Seguro · Modular · Multiempresa</b></footer>
      </section>

      <section className="login-access">
        <div className="login-card">
          <div className="login-card__logo"><img src="/cunha-c-premium.png" alt="" aria-hidden="true" /><span>Cunha Finance</span></div>
          <div className="login-card__heading"><span>Acesso seguro</span><h2>{modo === "login" ? "Bem-vindo de volta" : "Criar sua conta"}</h2><p>{modo === "login" ? "Entre com seus dados para acessar a plataforma." : "Preencha os dados para iniciar seu acesso."}</p></div>

          {mensagem && <div className={`login-message login-message--${mensagem.tipo}`} role="status">{mensagem.texto}</div>}

          <form onSubmit={modo === "login" ? entrar : cadastrar}>
            <label className="login-field"><span>E-mail</span><div><b>@</b><input type="email" autoComplete="email" placeholder="seuemail@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} /></div></label>
            <label className="login-field"><span>Senha</span><div><b>●</b><input type="password" autoComplete={modo === "login" ? "current-password" : "new-password"} placeholder="Digite sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={loading} /></div></label>

            {modo === "cadastro" && <div className="register-fields">
              <label className="login-field"><span>Empresa</span><div><b>◆</b><input autoComplete="organization" placeholder="Nome da empresa" value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} disabled={loading} /></div></label>
              <label className="login-field"><span>CPF</span><div><b>▣</b><input inputMode="numeric" autoComplete="off" placeholder="Informe seu CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={loading} /></div></label>
              <label className="login-field"><span>WhatsApp</span><div><b>◉</b><input inputMode="tel" autoComplete="tel" placeholder="Informe seu WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={loading} /></div></label>
            </div>}

            {modo === "login" && <div className="login-options"><span>Sessão protegida neste dispositivo</span><button type="button" onClick={recuperarSenha} disabled={loading}>Esqueci minha senha</button></div>}

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
