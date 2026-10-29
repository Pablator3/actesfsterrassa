"use client";

import { useState } from "react";

export default function LoginForm({ language }) {
  const [errorKey, setErrorKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const catalan = language === "ca";

  function resolveErrorKey(message) {
    if (/usuario o contraseña incorrectos|usuari.*contrasenya.*incorrect/i.test(message || "")) return "credentials";
    if (/acceso aún no está configurado|l'accés encara no està configurat/i.test(message || "")) return "configuration";
    if (/solicitud no válida|sol·licitud no vàlida/i.test(message || "")) return "invalid";
    return "generic";
  }

  const errors = catalan
    ? {
        credentials: "L’usuari o la contrasenya són incorrectes.",
        required: "Introdueix l’usuari i la contrasenya.",
        configuration: "L’accés encara no està configurat al servidor.",
        invalid: "La sol·licitud no és vàlida.",
        generic: "No s’ha pogut iniciar la sessió.",
        connection: "No s’ha pogut connectar. Torna-ho a provar.",
      }
    : {
        credentials: "Usuario o contraseña incorrectos.",
        required: "Introduce el usuario y la contraseña.",
        configuration: "El acceso aún no está configurado en el servidor.",
        invalid: "Solicitud no válida.",
        generic: "No se pudo iniciar sesión.",
        connection: "No se pudo conectar. Inténtalo de nuevo.",
      };

  async function submit(event) {
    event.preventDefault();
    setErrorKey("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    if (!username || !password) {
      setErrorKey("required");
      return;
    }

    setSubmitting(true);
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, next }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorKey(resolveErrorKey(data.error));
        return;
      }
      window.location.assign(data.redirectTo || "/");
    } catch {
      setErrorKey("connection");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <label htmlFor="username">{catalan ? "Usuari" : "Usuario"}</label>
      <input id="username" name="username" autoComplete="username" required />
      <label htmlFor="password">{catalan ? "Contrasenya" : "Contraseña"}</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <p className="login-error" role="alert" aria-live="polite">{errorKey ? errors[errorKey] : ""}</p>
      <button type="submit" disabled={submitting}>
        {submitting ? (catalan ? "Comprovant…" : "Comprobando…") : (catalan ? "Accedir" : "Entrar")}
      </button>
    </form>
  );
}
