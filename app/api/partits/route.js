import { fcfFetch, jsonError } from "@/lib/fcf";

const CLUB_ID = "6569";

function seasonFor(date) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const start = month >= 7 ? year : year - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}

function mapMatch(match) {
  const kickoff = String(match.COMIENZO1 || "").match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2}$/);
  const id = String(match.CODACTA || "").trim();
  const home = String(match.NOMBRE_CASA || "").trim();
  const away = String(match.NOMBRE_FUERA || "").trim();
  const hasScores = [match.GOLES_CASA, match.GOLES_FUERA]
    .every((score) => score !== null && score !== undefined && String(score).trim() !== "");
  const homeScore = Number(match.GOLES_CASA);
  const awayScore = Number(match.GOLES_FUERA);

  if (!kickoff || !/^\d{1,12}$/.test(id) || !home || !away) return null;
  if (!hasScores || String(match.CERRADA) !== "1" || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) return null;

  const jornada = Number(match.JORNADA);
  return {
    id,
    data: kickoff[1],
    hora: kickoff[2],
    jornada: Number.isInteger(jornada) && jornada > 0 ? jornada : "",
    local: home,
    visitant: away,
    golesLocal: homeScore,
    golesVisitant: awayScore,
    escudoLocal: String(match.ESCUDO_CASA || "").trim(),
    escudoVisitant: String(match.ESCUDO_FUERA || "").trim(),
    competicio: String(match.NOMBRE_COMPETICION || "").trim(),
    temporada: seasonFor(kickoff[1]),
  };
}

export async function GET(request) {
  const equip = new URL(request.url).searchParams.get("equip")?.trim() || "";
  if (!/^\d{1,12}$/.test(equip)) return jsonError("Selecciona un equipo válido.", 400);

  try {
    const response = await fcfFetch(`https://www.fcf.cat/api/clubs/${CLUB_ID}/team/${encodeURIComponent(equip)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return jsonError("La FCF no ha podido cargar los partidos.", 502);

    const payload = await response.json();
    if (!Array.isArray(payload?.data?.matches)) {
      return jsonError("La respuesta de partidos de la FCF no tiene el formato esperado.", 502);
    }

    const partits = payload.data.matches
      .map(mapMatch)
      .filter(Boolean)
      .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));

    return Response.json({ partits }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch {
    return jsonError("No se pudieron consultar los partidos en la FCF.", 502);
  }
}