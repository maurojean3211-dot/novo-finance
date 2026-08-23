import { ADMIN_BACKEND_MESSAGE } from "./services/adminUsers.service";

export default function PainelSistema() {
  return (
    <main style={containerStyle}>
      <h1>Usuários do sistema</h1>
      <p>
        {ADMIN_BACKEND_MESSAGE} A leitura global de usuários e a alteração de PIX de terceiros não são executadas diretamente pelo navegador.
      </p>
    </main>
  );
}

const containerStyle = {
  maxWidth: 760,
  margin: "40px auto",
  padding: 24,
  color: "#fff",
};
