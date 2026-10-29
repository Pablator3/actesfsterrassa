import { catalanNow, fcfFetch, jsonError } from "@/lib/fcf";

// Lista sancionados que no podían jugar este partido; si ya se jugó, cuenta como cumplido.
async function pendingSanctions(acta, allSanctions, actaId) {
  const groupId = String(acta.CODGRUPO || "");
  const round = Number(acta.JORNADA);
  if (!(round > 1)) return [];
  const thisMatchPlayed = acta.CERRADA === "1" && acta.GOLES_CASA != null && acta.GOLES_FUERA != null ? 1 : 0;
  const now = catalanNow();
  const targetKickoff = String(acta.COMIENZO1 || "").slice(0, 19).replace("T", " ");

  const teams = [
    { teamId: String(acta.CODEQUIPO_CASA || ""), clubId: String(acta.equipo_local?.CODCLUB || "") },
    { teamId: String(acta.CODEQUIPO_FUERA || ""), clubId: String(acta.equipo_visitante?.CODCLUB || "") },
  ];
  const pending = [];

  for (const { teamId, clubId } of teams) {
    if (!/^\d{1,12}$/.test(teamId) || !/^\d{1,12}$/.test(clubId)) continue;
    const candidates = allSanctions.filter((sanction) =>
      sanction?.tipo === "participante"
      && String(sanction.codequipo) === teamId
      && String(sanction.codacta || "") !== actaId
      && Number(sanction.partidos_sancion) > 0
      && Number(sanction.jornada) > 0
      && Number(sanction.jornada) < round);
    if (!candidates.length) continue;

    const response = await fcfFetch(`https://www.fcf.cat/api/clubs/${clubId}/team/${teamId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) continue;
    const matches = (await response.json())?.data?.matches;
    // En un partido futuro, los programados antes que él se dan por jugados.
    const played = (Array.isArray(matches) ? matches : []).filter((match) =>
      String(match.CODGRUPO) === groupId
      && Number(match.JORNADA) > 0
      && ((match.GOLES_CASA != null && match.GOLES_FUERA != null)
        || (String(match.COMIENZO1 || "") > now && String(match.COMIENZO1 || "") < targetKickoff)));

    for (const sanction of candidates) {
      const served = played.filter((match) =>
        Number(match.JORNADA) > Number(sanction.jornada) && Number(match.JORNADA) < round).length;
      const total = Number(sanction.partidos_sancion);
      if (total - served <= 0) continue;
      const cumplidos = Math.min(total, served + thisMatchPlayed);
      pending.push({ ...sanction, total, cumplidos, pendientes: total - cumplidos });
    }
  }
  return pending;
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("codacta")?.trim() || "";
  if (!/^\d{1,12}$/.test(id)) return jsonError("El identificador del acta no es válido.", 400);

  try {
    const response = await fcfFetch(`https://www.fcf.cat/api/acta/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const status = response.status === 404 || response.status === 410 ? 404 : 502;
      return jsonError("La FCF no ha publicado el acta de este partido.", status);
    }

    const acta = await response.json();
    let sanciones = [];
    let sancionesPrevias = [];
    const groupId = String(acta.CODGRUPO || "").trim();
    const season = String(acta.CODTEMPORADA || "").trim();

    if (/^\d{1,12}$/.test(groupId) && /^\d{1,12}$/.test(season)) {
      try {
        const sanctionsResponse = await fcfFetch(
          `https://www.fcf.cat/api/competition/sanciones?grupId=${encodeURIComponent(groupId)}&temporada=${encodeURIComponent(season)}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (sanctionsResponse.ok) {
          const payload = await sanctionsResponse.json();
          const allSanctions = Object.values(payload || {}).flatMap((items) => Array.isArray(items) ? items : []);
          sanciones = allSanctions.filter((sanction) => String(sanction?.codacta || "") === id);
          sancionesPrevias = await pendingSanctions(acta, allSanctions, id);
        }
      } catch {
        sanciones = [];
        sancionesPrevias = [];
      }
    }

    return Response.json({ acta, sanciones, sancionesPrevias }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch {
    return jsonError("No se pudo consultar el acta en la FCF.", 502);
  }
}