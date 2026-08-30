import { useCallback, useEffect, useState } from "react";
import { resolveNavigationPage, writeNavigationHistory } from "./navigationHistory.js";

export default function useAppNavigation(initialPage = "dashboard") {
  const [pagina, setPagina] = useState(() =>
    resolveNavigationPage(window.location.pathname, window.history.state, initialPage)
  );
  const navigate = useCallback((page, options) => {
    const targetPage = writeNavigationHistory(window, page, options);
    setPagina(targetPage);
  }, []);
  useEffect(() => {
    const onPopState = (event) => setPagina(
      resolveNavigationPage(window.location.pathname, event.state, initialPage)
    );
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialPage]);

  return { pagina, navigate };
}
