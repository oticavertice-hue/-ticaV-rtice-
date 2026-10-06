import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Toasts, Confirmador } from "./shared.jsx";

// A vitrine pública abre na raiz; o painel do dono abre em /admin.
// São carregados separados: quem só olha a vitrine nunca baixa o código do painel.
const Catalog = lazy(() => import("./Catalog.jsx"));
const Admin = lazy(() => import("./App.jsx"));

const painel = /^\/(admin|painel)(\/|$)/i.test(window.location.pathname);

createRoot(document.getElementById("root")).render(
  <>
    <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#0c0b0a" }} />}>{painel ? <Admin /> : <Catalog />}</Suspense>
    <Toasts />
    <Confirmador />
  </>,
);
