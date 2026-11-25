import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./app/auth-context.js";
import { App } from "./app/App.js";

const qc = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <StrictMode><QueryClientProvider client={qc}><AuthProvider><App /></AuthProvider></QueryClientProvider></StrictMode>,
);
