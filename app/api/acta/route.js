import { fcfFetch, jsonError } from "@/lib/fcf";

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
          sanciones = Object.values(payload || {})
            .flatMap((round) => Array.isArray(round) ? round : [])
            .filter((sanction) => String(sanction?.codacta || "") === id);
        }
      } catch {
        sanciones = [];
      }
    }

    return Response.json({ acta, sanciones }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch {
    return jsonError("No se pudo consultar el acta en la FCF.", 502);
  }
}