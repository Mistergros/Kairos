import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import "./print.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Alertes d’erreur : actives seulement si VITE_SENTRY_DSN est défini (Vercel).
// Pas de données personnelles (pas d’IP, pas d’enregistrement de session).
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE, sendDefaultPii: false });
}

const CrashFallback = () => (
  <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "80px auto", padding: "0 16px", textAlign: "center", color: "#0f172a" }}>
    <h1 style={{ fontSize: 22 }}>Une erreur inattendue est survenue</h1>
    <p style={{ color: "#475569" }}>Vos données déjà enregistrées ne sont pas perdues. Rechargez la page ; si le problème continue, écrivez-nous à contact@kaijos.com.</p>
    <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 12, border: 0, background: "#5b61f6", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Recharger la page</button>
  </div>
);

const enableServiceWorker = import.meta.env.VITE_ENABLE_SW === "true";
if (enableServiceWorker && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW optional; ignore errors
    });
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
