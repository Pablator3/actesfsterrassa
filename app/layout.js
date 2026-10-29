import "./globals.css";

export const metadata = {
  title: "Actes de partit / Actas de partido | Fundació Terrassa FC 1906",
  description: "Consulta les actes dels partits finalitzats de futbol sala de la Fundació Terrassa FC 1906. Consulta las actas de los partidos finalizados de fútbol sala de la Fundació Terrassa FC 1906.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}
