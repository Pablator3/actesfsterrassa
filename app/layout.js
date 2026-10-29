import "./globals.css";

export const metadata = {
  title: "Actas de partido | Fundació Terrassa FC 1906",
  description: "Consulta las actas de los partidos finalizados de fútbol sala de la Fundació Terrassa FC 1906.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
