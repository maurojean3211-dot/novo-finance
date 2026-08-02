import { useState } from "react";

export default function useAppNavigation(initialPage = "dashboard") {
  const [pagina, setPagina] = useState(initialPage);
  const navigate = (page) => setPagina(page);

  return { pagina, navigate };
}
