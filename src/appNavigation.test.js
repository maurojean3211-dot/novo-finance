import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  activeRoutes,
  menuGroups,
  pageForPath,
  pathForPage,
} from "./app/navigation/menuConfig.js";
import {
  chooseEntryPage,
  resolveNavigationPage,
  writeNavigationHistory,
} from "./app/navigation/navigationHistory.js";

function memoryWindow(initialPath = "/") {
  const entries = [{ path: initialPath, state: null }];
  let index = 0;
  const target = {
    location: { pathname: initialPath },
    history: {
      get state() { return entries[index].state; },
      pushState(state, _title, path) {
        entries.splice(index + 1);
        entries.push({ path, state });
        index += 1;
        target.location.pathname = path;
      },
      replaceState(state, _title, path) {
        entries[index] = { path, state };
        target.location.pathname = path;
      },
    },
    entries,
    back() {
      if (index > 0) index -= 1;
      target.location.pathname = entries[index].path;
      return entries[index].state;
    },
  };
  return target;
}

test("mapa converte page para pathname e pathname para page", () => {
  assert.equal(pathForPage("crm"), "/crm");
  assert.equal(pageForPath("/crm"), "crm");
  assert.equal(pathForPage("vendas"), "/vendas");
  assert.equal(pageForPath("/compras"), "compras");
  assert.equal(pageForPath("/compras/"), "compras");
});

test("todas as páginas ativas possuem caminhos únicos", () => {
  const activeItems = menuGroups.flatMap((group) => group.items).filter((item) => !item.planned);
  assert.ok(activeItems.every((item) => item.path));
  assert.equal(new Set(activeRoutes.map((route) => route.page)).size, activeRoutes.length);
  assert.equal(new Set(activeRoutes.map((route) => route.path)).size, activeRoutes.length);
});

test("CRM e Vendas geram entradas de histórico distintas", () => {
  const target = memoryWindow("/");
  writeNavigationHistory(target, "crm");
  writeNavigationHistory(target, "vendas");
  assert.deepEqual(target.entries.map((entry) => entry.path), ["/", "/crm", "/vendas"]);
  assert.deepEqual(target.entries.map((entry) => entry.state?.page || null), [null, "crm", "vendas"]);
});

test("popstate restaura a página pelo pathname", () => {
  const target = memoryWindow("/");
  writeNavigationHistory(target, "crm");
  writeNavigationHistory(target, "vendas");
  const state = target.back();
  assert.equal(resolveNavigationPage(target.location.pathname, state), "crm");
});

test("refresh e deep link de Compras resolvem Compras", () => {
  assert.equal(resolveNavigationPage("/compras", null), "compras");
});

test("history.state.page funciona apenas como fallback de path desconhecido", () => {
  assert.equal(resolveNavigationPage("/legado", { page: "crm" }), "crm");
  assert.equal(resolveNavigationPage("/vendas", { page: "crm" }), "vendas");
});

test("deep link autorizado é preservado e localStorage não o substitui", () => {
  const selected = chooseEntryPage({
    pathname: "/compras",
    loginMaster: false,
    tipoCliente: "PJ",
    savedPage: "crm",
    canAccess: (page) => page === "compras" || page === "crm",
  });
  assert.equal(selected, "compras");
});

test("rota sem permissão cai no destino seguro", () => {
  const selected = chooseEntryPage({
    pathname: "/usuarios",
    loginMaster: false,
    tipoCliente: "PJ",
    savedPage: null,
    canAccess: () => false,
  });
  assert.equal(selected, "dashboard");
});

test("Master mantém proteção especial", () => {
  assert.equal(chooseEntryPage({
    pathname: "/master", loginMaster: true, tipoCliente: "PJ", savedPage: null, canAccess: () => false,
  }), "master");
  assert.equal(chooseEntryPage({
    pathname: "/master", loginMaster: false, tipoCliente: "PF", savedPage: null, canAccess: () => true,
  }), "financeiro_pessoal");
});

test("rota desconhecida cai no Dashboard sem escrever histórico", () => {
  const target = memoryWindow("/desconhecida");
  assert.equal(resolveNavigationPage(target.location.pathname, null), "dashboard");
  assert.equal(target.entries.length, 1);
});

test("localStorage é fallback somente quando não existe rota reconhecida", () => {
  assert.equal(chooseEntryPage({
    pathname: "/desconhecida",
    loginMaster: false,
    tipoCliente: "PJ",
    savedPage: "crm",
    canAccess: (page) => page === "crm",
  }), "crm");
});

test("/reset e recovery permanecem prioritários no App", () => {
  const appPath = fileURLToPath(new URL("./App.jsx", import.meta.url));
  const source = readFileSync(appPath, "utf8");
  const resetGuard = source.indexOf('window.location.pathname === "/reset" || isPasswordSetupCallback()');
  const unauthenticatedGuard = source.indexOf("if (!session)");
  assert.ok(resetGuard >= 0 && resetGuard < unauthenticatedGuard);
  assert.match(source, /\["invite", "recovery"\]\.includes\(hash\.get\("type"\)\)/);
});

test("Sidebar e mobile continuam compatíveis com navigate(page)", () => {
  const sidebar = readFileSync(
    fileURLToPath(new URL("./components/layout/Sidebar.jsx", import.meta.url)),
    "utf8",
  );
  const mobile = readFileSync(
    fileURLToPath(new URL("./components/layout/MobileNavigation.jsx", import.meta.url)),
    "utf8",
  );
  assert.match(sidebar, /onNavigate\(item\.page\)/);
  assert.match(mobile, /onNavigate\(page\)/);
});
