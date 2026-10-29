"use client";

import Image from "next/image";
import { setLanguage, tr, useLanguage } from "@/lib/language";
import LoginForm from "./login-form";

export default function LoginPanel() {
  const language = useLanguage();
  const catalan = language === "ca";

  return (
    <main className="login-page" lang={language}>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-language" role="group" aria-label={catalan ? "Idioma" : "Idioma"}>
          <button type="button" title="Català" aria-pressed={catalan} onClick={() => setLanguage("ca")}>CA</button>
          <button type="button" title="Español" aria-pressed={!catalan} onClick={() => setLanguage("es")}>ES</button>
        </div>
        <Image className="club-mark" src="https://files.fcf.cat/escudos/clubes/escudos/00100_0000988633_TERRASSAFCnou.png" alt={catalan ? "Escut de la Fundació Terrassa FC 1906" : "Escudo de la Fundació Terrassa FC 1906"} width={72} height={72} unoptimized />
        <p className="eyebrow">Fundació Terrassa FC 1906</p>
        <h1 id="login-title">{tr(language, "Accés privat", "Acceso privado")}</h1>
        <p className="login-description">{tr(language, "Introdueix les teves credencials per continuar.", "Introduce tus credenciales para continuar.")}</p>
        <LoginForm language={language} />
      </section>
      <footer className="login-footer">{tr(language, "Futbol sala · Actes de partit", "Fútbol sala · Actas de partido")}</footer>
    </main>
  );
}
