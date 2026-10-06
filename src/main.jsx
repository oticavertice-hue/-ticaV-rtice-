import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";

// endereço com "catalogo" abre a vitrine pública; o resto abre o app de gestão (com login).
// Cada um baixa só o próprio código: o cliente que abre o catálogo não carrega o app inteiro.
const App = lazy(() => import("./App.jsx"));
const Catalog = lazy(() => import("./Catalog.jsx"));

const publico = window.location.pathname.toLowerCase().includes("catalogo");
createRoot(document.getElementById("root")).render(
  <Suspense fallback={<div style={{ minHeight: "100vh", background: "#151618" }} />}>
    {publico ? <Catalog /> : <App />}
  </Suspense>
);
