import { useEffect, useState } from "react";

function pageFromPath(fallbackPage) {
  return window.location.pathname === "/prospeccao" ? "prospeccao" : fallbackPage;
}

export default function useAppNavigation(initialPage = "dashboard") {
  const [pagina, setPagina] = useState(() => pageFromPath(initialPage));
  const navigate = (page) => {
    setPagina(page);
    const path = page === "prospeccao" ? "/prospeccao" : "/";
    if (window.location.pathname !== path) window.history.pushState({ page }, "", path);
  };
  useEffect(() => {
    const onPopState = () => setPagina(pageFromPath(initialPage));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialPage]);

  return { pagina, navigate };
}
