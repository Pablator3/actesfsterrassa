import { catalanNow, fcfFetch, jsonError } from "@/lib/fcf";

const CLUB_ID = "6569";
const UPCOMING_LIMIT = 6;

function mapMatch(match, competition) {
  const kickoff = String(match.COMIENZO1 || "").match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2}$/);
  const id = String(match.CODACTA || "").trim();
  const home = String(match.NOMBRE_CASA || "").trim();
  const away = String(match.NOMBRE_FUERA || "").trim();
  if (!kickoff || !/^\d{1,12}$/.test(id) || !home || !away) return null;

  const jornada = Number(match.JORNADA);
  return {
    id,
    data: kickoff[1],
    hora: kickoff[2],
    jornada: Number.isInteger(jornada) && jornada > 0 ? jornada : "",
    local: home,
    visitant: away,
    escudoLocal: String(match.ESCUDO_CASA || "").trim(),
    escudoVisitant: String(match.ESCUDO_FUERA || "").trim(),
    competicio: String(match.NOMBRE_COMPETICION || competition || "").trim(),
  };
}

export async function GET(request) {
  const equip = new URL(request.url).searchParams.get("equip")?.trim() || "";
  if (!/^\d{1,12}$/.test(equip)) return jsonError("Selecciona un equipo válido.", 400);

  try {
    const response = await fcfFetch(`https://www.fcf.cat/api/clubs/${CLUB_ID}/team/${encodeURIComponent(equip)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return jsonError("La FCF no ha podido cargar los próximos partidos.", 502);

    const payload = await response.json();
    const matches = payload?.data?.matches;
    if (!Array.isArray(matches)) {
      return jsonError("La respuesta de partidos de la FCF no tiene el formato esperado.", 502);
    }

    const competition = String(payload.data.info?.CATEGORIA_EQUIPO || "").trim();
    const now = catalanNow();
    const partits = matches
      .filter((match) => String(match.COMIENZO1 || "") >= now)
      .sort((a, b) => String(a.COMIENZO1).localeCompare(String(b.COMIENZO1)))
      .map((match) => mapMatch(match, competition))
      .filter(Boolean)
      .slice(0, UPCOMING_LIMIT);

    return Response.json({ partits }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch {
    return jsonError("No se pudieron consultar los próximos partidos en la FCF.", 502);
  }
}
