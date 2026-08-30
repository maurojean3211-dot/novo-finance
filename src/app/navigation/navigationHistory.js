import { isActivePage, pageForPath, pathForPage } from "./menuConfig.js";

export function resolveNavigationPage(pathname, historyState, fallbackPage = "dashboard") {
  const pathPage = pageForPath(pathname);
  if (pathPage) return pathPage;
  if (isActivePage(historyState?.page)) return historyState.page;
  return isActivePage(fallbackPage) ? fallbackPage : "dashboard";
}

export function writeNavigationHistory(targetWindow, page, { replace = false } = {}) {
  const targetPage = isActivePage(page) ? page : "dashboard";
  const targetPath = pathForPage(targetPage);
  const currentPage = resolveNavigationPage(
    targetWindow.location.pathname,
    targetWindow.history.state,
  );
  if (targetWindow.location.pathname === targetPath && currentPage === targetPage) {
    return targetPage;
  }
  const method = replace ? "replaceState" : "pushState";
  targetWindow.history[method]({ page: targetPage }, "", targetPath);
  return targetPage;
}

export function chooseEntryPage({
  pathname,
  loginMaster,
  tipoCliente,
  savedPage,
  canAccess,
}) {
  const defaultPage = tipoCliente === "PF" ? "financeiro_pessoal" : "dashboard";
  const requestedPage = pageForPath(pathname);
  if (loginMaster) return "master";
  if (requestedPage) {
    return requestedPage !== "master" && canAccess(requestedPage)
      ? requestedPage
      : defaultPage;
  }
  return savedPage && canAccess(savedPage) ? savedPage : defaultPage;
}
