import { NextResponse } from "next/server";
import { constantTimeEqual, createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "../../../../lib/auth.js";

function safeRedirect(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const target = new URL(value, "https://local.invalid");
    if (target.origin !== "https://local.invalid") return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export async function POST(request) {
  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!expectedUsername || !expectedPassword || !secret || Buffer.byteLength(secret, "utf8") < 32) {
    return NextResponse.json({ error: "El acceso aún no está configurado en el servidor." }, { status: 503 });
  }

  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const username = typeof credentials.username === "string" ? credentials.username : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";
  const validUsername = constantTimeEqual(username, expectedUsername);
  const validPassword = constantTimeEqual(password, expectedPassword);
  if (!validUsername || !validPassword) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({ redirectTo: safeRedirect(credentials.next) });
  response.cookies.set(SESSION_COOKIE, createSession(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
