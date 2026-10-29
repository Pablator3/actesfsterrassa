import { fcfFetch, jsonError } from "@/lib/fcf";

const CLUB_ID = "6569";

export async function GET() {
  try {
    const response = await fcfFetch(`https://www.fcf.cat/api/clubs/${CLUB_ID}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return jsonError("La FCF no ha podido cargar los equipos.", 502);

    const payload = await response.json();
    if (!Array.isArray(payload?.data?.teams)) {
      return jsonError("La respuesta de equipos de la FCF no tiene el formato esperado.", 502);
    }

    const equips = payload.data.teams
      .filter((team) => /futbol\s+sala/i.test(String(team.categoria_nombre || "")))
      .map((team) => {
        const id = String(team.codequipo || "").trim();
        const name = String(team.nombre_equipo || "").trim();
        const category = String(team.categoria_nombre || "").trim();
        const letter = String(team.letra_equipo || "").trim();
        if (!/^\d{1,12}$/.test(id) || !name || !category) return null;
        return {
          id,
          nom: letter ? `${name} "${letter}"` : name,
          categoria: category,
          etiqueta: `${category}${letter ? ` · ${letter}` : ""}`,
        };
      })
      .filter(Boolean);

    return Response.json({ equips }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return jsonError("No se pudo consultar la FCF. Inténtalo de nuevo más tarde.", 502);
  }
}