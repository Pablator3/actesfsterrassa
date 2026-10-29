"use client";

import { useEffect, useSyncExternalStore } from "react";

export const LANGUAGE_STORAGE_KEY = "futsal-terrassa-language";
const LANGUAGE_CHANGE_EVENT = "futsal-terrassa-language-change";

function getLanguage() {
  if (typeof window === "undefined") return "ca";
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "es" ? "es" : "ca";
  } catch {
    return "ca";
  }
}

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguage, () => "ca");
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return language;
}

export function setLanguage(language) {
  const nextLanguage = language === "es" ? "es" : "ca";
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = nextLanguage;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
}

export function tr(language, catalan, spanish) {
  return language === "ca" ? catalan : spanish;
}