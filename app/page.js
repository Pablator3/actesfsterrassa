"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { setLanguage, tr, useLanguage } from "@/lib/language";

const CREST_URL = "https://files.fcf.cat/escudos/clubes/escudos/";
const CLUB_CREST = `${CREST_URL}00100_0000988633_TERRASSAFCnou.png`;

function currentSeason() {
  const today = new Date();
  const start = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return { value: `${start}/${String(start + 1).slice(-2)}`, label: `${start} / ${start + 1}` };
}

const CURRENT_SEASON = currentSeason();

function displayDate(value, options = {}, language = "es") {
  const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return tr(language, "Data pendent", "Fecha pendiente");
  return new Intl.DateTimeFormat(language === "ca" ? "ca-ES" : "es-ES", options).format(new Date(year, month - 1, day));
}

function asList(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function isSecondYellow(card) {
  return [true, 1, "1", "true"].includes(card.segunda_amarilla);
}

function isRedCard(card) {
  const type = String(card.tipo_tarjeta || "").trim().toLowerCase();
  return ["101", "200", "2", "roja", "red"].includes(type) || isSecondYellow(card);
}

function crestUrl(file) {
  return file ? `${CREST_URL}${encodeURIComponent(file)}` : "";
}

function SideRoster({ title, players, language }) {
  const roster = asList(players);
  if (!roster.length) return null;

  return (
    <details className="roster-details">
      <summary>{title}<span>{roster.length}</span></summary>
      <ol>
        {roster.map((player, index) => (
          <li key={player.id || `${player.nombre}-${index}`}>
            <span className="player-number">{player.dorsal || "–"}</span>
            <span>{player.nombre || "Jugador"}</span>
            {player.titular === "1" && <small>Titular</small>}
            {(player.portero === 1 || player.portero === "1" || player.portero === true) && <small className="goalkeeper-badge">{tr(language, "Porter", "Portero")}</small>}
          </li>
        ))}
      </ol>
    </details>
  );
}

function SanctionsSection({ previas, language }) {
  return (
    <section className="acta-section">
      <h3>{tr(language, "Sancions prèvies", "Sanciones previas")} <span>{previas.length}</span></h3>
      {previas.length ? (
        <ul className="event-list">
          {previas.map((sanction, index) => (
            <li key={`${sanction.codparticipante}-${sanction.codacta}-${index}`}>
              {sanction.escudo && <Image className="event-crest" src={crestUrl(sanction.escudo)} alt={`Escudo de ${(sanction.nombre_equipo || "").trim()}`} width={20} height={20} unoptimized />}
              <span>
                {sanction.participante_nombre || "Jugador"}
                <small>{(sanction.nombre_equipo || "").trim()}</small>
                <small>{tr(language, "Sancionat a la jornada", "Sancionado en la jornada")} {sanction.jornada}{sanction.articulo_salida ? ` · Art. ${sanction.articulo_salida}` : ""}</small>
              </span>
              <div className="sanction-counts" aria-label={tr(language, `${sanction.total} partits de sanció, ${sanction.cumplidos} complerts, ${sanction.pendientes} pendents`, `${sanction.total} partidos de sanción, ${sanction.cumplidos} cumplidos, ${sanction.pendientes} restantes`)}>
                <span><b>{sanction.total}</b><small>{tr(language, "Sanció", "Sanción")}</small></span>
                <span><b>{sanction.cumplidos}</b><small>{tr(language, "Complerts", "Cumplidos")}</small></span>
                <span className="is-remaining"><b>{sanction.pendientes}</b><small>{tr(language, "Pendents", "Restantes")}</small></span>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="empty-note">{tr(language, "Cap jugador sancionat per partits anteriors.", "Ningún jugador sancionado por partidos anteriores.")}</p>}
    </section>
  );
}

function displayOfficialRole(role, language) {
  if (language === "ca") return role;
  return String(role || "").replace(/^Assistent/, "Asistente");
}

function ActaDetails({ acta, sanciones = [], previas = [], language }) {
  const home = acta.equipo_local?.NOMBRE_EQUIPO || "Local";
  const away = acta.equipo_visitante?.NOMBRE_EQUIPO || tr(language, "Visitant", "Visitante");
  const homeRoster = new Map(asList(acta.jugadores_equipo_local).map((player) => [String(player.id), player]));
  const awayRoster = new Map(asList(acta.jugadores_equipo_visitante).map((player) => [String(player.id), player]));
  const mapEvents = (events, team, roster, crest) => asList(events).map((event) => {
    const player = roster.get(String(event.id_jugador));
    return {
      ...event,
      team,
      escudo: crest,
      nombre_jugador: event.nombre_jugador || player?.nombre || "Jugador",
      dorsal: event.dorsal || player?.dorsal || "",
    };
  });
  const goals = [
    ...mapEvents(acta.goles_equipo_local, home, homeRoster, acta.equipo_local?.escudo),
    ...mapEvents(acta.goles_equipo_visitante, away, awayRoster, acta.equipo_visitante?.escudo),
  ].sort((a, b) => Number(a.minuto || 0) - Number(b.minuto || 0));
  const cardEvents = [
    ...mapEvents(acta.tarjetas_equipo_local, home, homeRoster, acta.equipo_local?.escudo),
    ...mapEvents(acta.tarjetas_equipo_visitante, away, awayRoster, acta.equipo_visitante?.escudo),
  ].sort((a, b) => Number(a.minuto || 0) - Number(b.minuto || 0));
  const yellowCountByPlayer = new Map();
  const cards = cardEvents.map((event) => {
    const playerId = String(event.id_jugador || "");
    const isYellow = String(event.tipo_tarjeta || "") === "100";
    const previousYellows = playerId ? yellowCountByPlayer.get(playerId) || 0 : 0;
    const secondYellow = isYellow && previousYellows > 0;
    if (playerId && isYellow) yellowCountByPlayer.set(playerId, previousYellows + 1);
    return {
      ...event,
      segunda_amarilla: isSecondYellow(event) || secondYellow,
    };
  });
  const sanctionsByPlayer = new Map();
  for (const sanction of asList(sanciones)) {
    const playerId = String(sanction.codparticipante || "");
    const matches = Number(sanction.partidos_sancion);
    if (sanction.tipo !== "participante" || !playerId || !Number.isFinite(matches) || matches <= 0) continue;
    const playerSanctions = sanctionsByPlayer.get(playerId) || [];
    playerSanctions.push({ ...sanction, matches });
    sanctionsByPlayer.set(playerId, playerSanctions);
  }
  const redCardCount = cards.filter(isRedCard).length;
  const yellowCardCount = cards.length - redCardCount;
  const officials = asList(acta.arbitros);

  return (
    <div className="acta-details">
      <div className="acta-meta">
        <span>{acta.nombre_competicion || acta.nombre_grupo || tr(language, "Competició FCF", "Competición FCF")}</span>
        <span>{acta.temporada_nombre || ""}{acta.JORNADA ? ` · Jornada ${acta.JORNADA}` : ""}</span>
        <span>{acta.CAMPO || tr(language, "Pavelló no informat", "Pabellón no informado")}</span>
      </div>
      <div className="acta-columns">
        <section className="acta-section">
          <h3>{tr(language, "Gols", "Goles")} <span>{goals.length}</span></h3>
          {goals.length ? (
            <ul className="event-list">
              {goals.map((event, index) => (
                <li key={`${event.id_jugador}-${event.minuto}-${index}`}>
                  <strong>{event.minuto || "–"}&apos;</strong>
                  {event.escudo && <Image className="event-crest" src={crestUrl(event.escudo)} alt={`Escudo de ${event.team}`} width={20} height={20} unoptimized />}
                  <span>{event.nombre_jugador || "Jugador"}<small>{event.team}</small></span>
                  <b>{event.dorsal ? `#${event.dorsal}` : ""}</b>
                </li>
              ))}
            </ul>
          ) : <p className="empty-note">{tr(language, "Sense gols detallats.", "Sin goles detallados.")}</p>}
        </section>
        <section className="acta-section">
          <h3>{tr(language, "Targetes", "Tarjetas")} <span>{cards.length}</span></h3>
          <div className="card-counts" aria-label={tr(language, `${yellowCardCount} grogues, ${redCardCount} expulsions`, `${yellowCardCount} amarillas, ${redCardCount} expulsiones`)}>
            <span className="yellow-count">{yellowCardCount} {tr(language, "grogues", "amarillas")}</span>
            <span className="count-divider" aria-hidden="true" />
            <span className="red-count">{redCardCount} {tr(language, "expulsions", "expulsiones")}</span>
          </div>
          {cards.length ? (
            <ul className="event-list">
              {cards.map((event, index) => (
                <li key={`${event.id_jugador}-${event.minuto}-${index}`}>
                  <strong>{event.minuto || "–"}&apos;</strong>
                  {event.escudo && <Image className="event-crest" src={crestUrl(event.escudo)} alt={`Escudo de ${event.team}`} width={20} height={20} unoptimized />}
                  <span>
                    {event.nombre_jugador || "Jugador"}
                    <small>{event.team}</small>
                    {(sanctionsByPlayer.get(String(event.id_jugador || "")) || []).map((sanction, sanctionIndex) => (
                      <small className="sanction-label" key={`${sanction.articulo_salida}-${sanctionIndex}`}>
                        {sanction.matches} {sanction.matches === 1 ? tr(language, "partit", "partido") : tr(language, "partits", "partidos")} {tr(language, "de sanció", "de sanción")}
                        {sanction.articulo_salida ? ` · Art. ${sanction.articulo_salida}` : ""}
                      </small>
                    ))}
                  </span>
                  {isSecondYellow(event) ? (
                    <span className="card-pair" role="img" aria-label={tr(language, "Expulsió per segona targeta groga", "Expulsión por segunda tarjeta amarilla")} title={tr(language, "Expulsió per segona targeta groga", "Expulsión por segunda tarjeta amarilla")}>
                      <span className="card-shape" aria-hidden="true" />
                      <span className="card-shape is-red" aria-hidden="true" />
                    </span>
                  ) : isRedCard(event) ? (
                    <span className="card-shape is-red" role="img" aria-label={tr(language, "Targeta vermella", "Tarjeta roja")} title={tr(language, "Targeta vermella", "Tarjeta roja")} />
                  ) : (
                    <span className="card-shape" role="img" aria-label={tr(language, "Targeta groga", "Tarjeta amarilla")} title={tr(language, "Targeta groga", "Tarjeta amarilla")} />
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="empty-note">{tr(language, "Sense targetes registrades.", "Sin tarjetas registradas.")}</p>}
        </section>
        <div className="acta-stack">
          <SanctionsSection previas={previas} language={language} />
          <section className="acta-section acta-section-compact">
            <h3>{tr(language, "Arbitratge", "Arbitraje")} <span>{officials.length}</span></h3>
            {officials.length ? (
              <ul className="official-list">
                {officials.map((official, index) => (
                  <li key={official.CODARBITRO || index}>
                    <span>{official.nombre_arbitro}</span><small>{displayOfficialRole(official.rol || tr(language, "Àrbitre", "Árbitro"), language)}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="empty-note">{tr(language, "Sense arbitratge publicat.", "Sin arbitraje publicado.")}</p>}
          </section>
        </div>
      </div>
      <div className="roster-grid">
        <SideRoster title={`${tr(language, "Plantilla local", "Plantilla local")} · ${home}`} players={acta.jugadores_equipo_local} language={language} />
        <SideRoster title={`${tr(language, "Plantilla visitant", "Plantilla visitante")} · ${away}`} players={acta.jugadores_equipo_visitante} language={language} />
      </div>
      <p className="acta-source">{tr(language, "Acta i sancions consultades a la Federació Catalana de Futbol.", "Acta y sanciones consultadas en la Federació Catalana de Futbol.")}</p>
    </div>
  );
}

// Se monta con key={teamId}: al cambiar de equipo se reinicia y recarga sus próximos partidos.
function PendingActas({ teamId, team, language }) {
  const [matches, setMatches] = useState([]);
  const [matchId, setMatchId] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(Boolean(teamId));
  const [error, setError] = useState("");
  const [detail, setDetail] = useState({ loading: false, error: "", previas: null });
  const requestId = useRef(0);

  useEffect(() => {
    if (!teamId) return;
    const controller = new AbortController();
    fetch(`/api/pendents?equip=${encodeURIComponent(teamId)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("pending-matches");
        setMatches(payload.partits || []);
      })
      .catch((caught) => {
        if (caught.name !== "AbortError") setError("pending-matches");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMatches(false);
      });
    return () => controller.abort();
  }, [teamId]);

  async function selectMatch(id) {
    const current = ++requestId.current;
    setMatchId(id);
    setDetail({ loading: Boolean(id), error: "", previas: null });
    if (!id) return;
    try {
      const response = await fetch(`/api/acta?codacta=${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(tr(language, "No s'han pogut consultar les sancions.", "No se pudieron consultar las sanciones."));
      if (current === requestId.current) setDetail({ loading: false, error: "", previas: payload.sancionesPrevias || [] });
    } catch (caught) {
      if (current === requestId.current) setDetail({ loading: false, error: tr(language, "No s'han pogut consultar les sancions.", "No se pudieron consultar las sanciones."), previas: null });
    }
  }

  const selectedMatch = matches.find((match) => match.id === matchId);

  return (
    <>
      <div className="pending-filters">
        <div className="filter-field">
          <label htmlFor="pending-match">{tr(language, "Proper partit", "Próximo partido")}</label>
          <select id="pending-match" value={matchId} disabled={!matches.length} onChange={(event) => selectMatch(event.target.value)}>
            <option value="">{loadingMatches
              ? tr(language, "Carregant partits…", "Cargando partidos…")
              : matches.length ? tr(language, `Tria un dels ${matches.length} propers partits`, `Elige uno de los ${matches.length} próximos partidos`)
                : tr(language, "No hi ha partits propers", "No hay próximos partidos")}</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.jornada ? `J${match.jornada}` : tr(language, "Amistós", "Amistoso")} · {displayDate(match.data, { day: "2-digit", month: "short" }, language).replace(".", "")} {match.hora} · {match.local} – {match.visitant}
              </option>
            ))}
          </select>
        </div>
      </div>
      <section className="results" aria-labelledby="pending-heading">
      <div className="results-heading">
        <h2 id="pending-heading">{tr(language, "Actes pendents", "Actas pendientes")} <span className="results-count">{matches.length}</span></h2>
        <span>{team ? `${team.nom} · ${team.categoria}` : tr(language, "Propers partits", "Próximos partidos")}</span>
      </div>
      {error && <p className="notice error-text" role="alert">{tr(language, "No s'han pogut carregar els propers partits.", "No se pudieron cargar los próximos partidos.")}</p>}
      {selectedMatch && (
        <article className="match-card pending-card">
          <div className="match-row pending-row">
            <div className="match-date">
              <strong>{displayDate(selectedMatch.data, { day: "2-digit" }, language)}</strong>
              <span>{displayDate(selectedMatch.data, { month: "short" }, language).replace(".", "")}</span>
            </div>
            <div className="match-main">
              <div className="match-context">
                <span>{selectedMatch.jornada ? `${tr(language, "Jornada", "Jornada")} ${selectedMatch.jornada}` : tr(language, "Partit amistós", "Partido amistoso")}</span>
                <span>{selectedMatch.hora} h</span>
                <span>{selectedMatch.competicio}</span>
              </div>
              <div className="fixture">
                <span className="team-name home-team">
                  {selectedMatch.escudoLocal && <Image src={crestUrl(selectedMatch.escudoLocal)} alt="" width={27} height={27} unoptimized />}
                  {selectedMatch.local}
                </span>
                <strong className="score">VS</strong>
                <span className="team-name away-team">
                  {selectedMatch.escudoVisitant && <Image src={crestUrl(selectedMatch.escudoVisitant)} alt="" width={27} height={27} unoptimized />}
                  {selectedMatch.visitant}
                </span>
              </div>
            </div>
          </div>
          <div className="pending-detail" aria-live="polite">
            {detail.loading && <p className="inline-status">{tr(language, "Consultant sancions…", "Consultando sanciones…")}</p>}
            {detail.error && <p className="inline-status error-text">{detail.error}</p>}
            {detail.previas && <SanctionsSection previas={detail.previas} language={language} />}
          </div>
        </article>
      )}
      </section>
    </>
  );
}

function MatchCard({ match, expanded, acta, onToggle, language }) {
  return (
    <article className={`match-card${expanded ? " is-expanded" : ""}`}>
      <div className="match-row">
        <div className="match-date">
          <strong>{displayDate(match.data, { day: "2-digit" }, language)}</strong>
          <span>{displayDate(match.data, { month: "short" }, language).replace(".", "")}</span>
        </div>
        <div className="match-main">
          <div className="match-context">
            <span>{match.jornada ? `${tr(language, "Jornada", "Jornada")} ${match.jornada}` : tr(language, "Partit finalitzat", "Partido finalizado")}</span>
            <span>{match.competicio || match.temporada}</span>
          </div>
          <div className="fixture">
            <span className="team-name home-team">
              {match.escudoLocal && <Image src={crestUrl(match.escudoLocal)} alt="" width={27} height={27} unoptimized />}
              {match.local}
            </span>
            <strong className="score">{match.golesLocal} <i>–</i> {match.golesVisitant}</strong>
            <span className="team-name away-team">
              {match.escudoVisitant && <Image src={crestUrl(match.escudoVisitant)} alt="" width={27} height={27} unoptimized />}
              {match.visitant}
            </span>
          </div>
        </div>
        <button className="acta-button" type="button" aria-expanded={expanded} onClick={onToggle}>
          <span className="acta-icon" aria-hidden="true">{expanded ? "−" : "+"}</span>
          {expanded ? tr(language, "Tancar acta", "Cerrar acta") : tr(language, "Veure acta", "Ver acta")}
        </button>
      </div>
      {expanded && (
        <div className="acta-wrap" aria-live="polite">
          {acta.loading && <p className="inline-status">{tr(language, "Carregant l'acta…", "Cargando el acta…")}</p>}
          {acta.error && <p className="inline-status error-text">{acta.error}</p>}
          {acta.data && <ActaDetails acta={acta.data} sanciones={acta.sanciones} previas={acta.previas} language={language} />}
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const language = useLanguage();
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [matches, setMatches] = useState([]);
  const [season, setSeason] = useState(CURRENT_SEASON.value);
  const [query, setQuery] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actaState, setActaState] = useState({ id: "", loading: false, error: "", data: null });
  const [mode, setMode] = useState("closed");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/equips", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("teams");
        const nextTeams = payload.equips || [];
        setTeams(nextTeams);
        setTeamId(nextTeams[0]?.id || "");
        setLoadingMatches(nextTeams.length > 0);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setPageError("teams");
          setLoadingMatches(false);
        }
      })
      .finally(() => setLoadingTeams(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!teamId) return;
    const controller = new AbortController();
    fetch(`/api/partits?equip=${encodeURIComponent(teamId)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("matches");
        setMatches(payload.partits || []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setPageError("matches");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMatches(false);
      });
    return () => controller.abort();
  }, [teamId]);

  const seasons = [...new Set([CURRENT_SEASON.value, ...matches.map((match) => match.temporada)])]
    .sort((a, b) => b.localeCompare(a));
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase(language === "ca" ? "ca" : "es");
  const filteredMatches = matches.filter((match) => {
    const matchesSeason = season === "all" || match.temporada === season;
    const matchesQuery = !normalizedQuery || `${match.local} ${match.visitant} ${match.competicio}`.toLocaleLowerCase(language === "ca" ? "ca" : "es").includes(normalizedQuery);
    return matchesSeason && matchesQuery;
  });

  async function toggleActa(match) {
    if (actaState.id === match.id && !actaState.loading) {
      setActaState({ id: "", loading: false, error: "", data: null });
      return;
    }
    setActaState({ id: match.id, loading: true, error: "", data: null });
    try {
      const response = await fetch(`/api/acta?codacta=${encodeURIComponent(match.id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(tr(language, "No s'ha pogut carregar l'acta.", "No se pudo cargar el acta."));
      setActaState({ id: match.id, loading: false, error: "", data: payload.acta, sanciones: payload.sanciones || [], previas: payload.sancionesPrevias || [] });
    } catch (error) {
      setActaState({ id: match.id, loading: false, error: tr(language, "No s'ha pogut carregar l'acta.", "No se pudo cargar el acta."), data: null });
    }
  }

  const selectedTeam = teams.find((team) => team.id === teamId);
  const pageErrorText = pageError === "teams"
    ? tr(language, "No s'han pogut carregar els equips.", "No se pudieron cargar los equipos.")
    : pageError === "matches"
      ? tr(language, "No s'han pogut carregar els partits.", "No se pudieron cargar los partidos.")
      : pageError;

  return (
    <main className="shell">
      <header className="masthead">
        <Image className="club-logo" src={CLUB_CREST} alt={tr(language, "Escut de la Fundació Terrassa FC 1906", "Escudo de la Fundació Terrassa FC 1906")} width={54} height={54} unoptimized />
        <div className="brand">
          <p>Fundació Terrassa FC 1906</p>
          <span>{tr(language, "Futbol sala · Arxiu de partits", "Fútbol sala · Archivo de partidos")}</span>
        </div>
        <div className="login-language language-switch" role="group" aria-label={tr(language, "Idioma", "Idioma")}>
          <button type="button" title="Català" aria-pressed={language === "ca"} onClick={() => setLanguage("ca")}>CA</button>
          <button type="button" title="Español" aria-pressed={language === "es"} onClick={() => setLanguage("es")}>ES</button>
        </div>
        <div className="season-mark"><span>{tr(language, "Temporada actual", "Temporada actual")}</span><strong>{CURRENT_SEASON.label}</strong></div>
        <a className="logout-button" href="/api/auth/logout">{tr(language, "Tancar sessió", "Cerrar sesión")}</a>
      </header>

      <section className="page-heading">
        <div>
          <div className="page-title-line">
            <h1>{tr(language, "Actes de partit", "Actas de partido")}</h1>
            <p className="heading-copy">{mode === "closed"
              ? tr(language, "Busca partits finalitzats i consulta'n l'acta.", "Busca partidos finalizados y consulta el acta desde cada encuentro.")
              : tr(language, "Tria un dels propers partits i consulta quins jugadors no podran jugar-lo per sanció.", "Elige uno de los próximos partidos y consulta qué jugadores no podrán jugarlo por sanción.")}</p>
          </div>
        </div>
      </section>

      <section className="mode-section" aria-labelledby="mode-heading">
        <div className="section-head"><h3 id="mode-heading">{tr(language, "Tipus d'acta", "Tipo de acta")}</h3></div>
        <div className="seg" role="group" aria-labelledby="mode-heading">
          <button type="button" aria-pressed={mode === "closed"} onClick={() => setMode("closed")}>{tr(language, "Actes tancades", "Actas cerradas")}</button>
          <button type="button" aria-pressed={mode === "pending"} onClick={() => setMode("pending")}>{tr(language, "Actes pendents", "Actas pendientes")}</button>
        </div>
      </section>

      <section className={`filters${mode === "pending" ? " is-pending" : ""}`} aria-label={tr(language, "Filtres de partits", "Filtros de partidos")}>
        <div className="filter-field team-filter">
          <label htmlFor="team-select">{tr(language, "Equip", "Equipo")}</label>
          <select id="team-select" value={teamId} disabled={loadingTeams || !teams.length} onChange={(event) => {
            setLoadingMatches(Boolean(event.target.value));
            setPageError("");
            setMatches([]);
            setSeason(CURRENT_SEASON.value);
            setActaState({ id: "", loading: false, error: "", data: null });
            setTeamId(event.target.value);
          }}>
            {loadingTeams && <option value="">{tr(language, "Carregant equips…", "Cargando equipos…")}</option>}
            {!loadingTeams && !teams.length && <option value="">{tr(language, "No hi ha equips disponibles", "No hay equipos disponibles")}</option>}
            {teams.map((team) => <option key={team.id} value={team.id}>{team.etiqueta}</option>)}
          </select>
        </div>
        {mode === "closed" && (
          <>
            <div className="filter-field season-filter">
              <label htmlFor="season-select">{tr(language, "Temporada", "Temporada")}</label>
              <select id="season-select" value={season} onChange={(event) => setSeason(event.target.value)} disabled={!seasons.length}>
                <option value="all">{tr(language, "Totes les temporades", "Todas las temporadas")}</option>
                {seasons.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="filter-field search-filter">
              <label htmlFor="match-search">{tr(language, "Rival o competició", "Rival o competición")}</label>
              <input id="match-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr(language, "Cercar partit…", "Buscar partido…")} />
            </div>
            <div className="filter-total"><strong>{filteredMatches.length}</strong><span>{tr(language, "resultats", "resultados")}</span></div>
          </>
        )}
      </section>

      {mode === "closed" && (
      <section className="results" aria-labelledby="results-heading">
        <div className="results-heading">
          <h2 id="results-heading">{tr(language, "Actes tancades", "Actas cerradas")} <span className="results-count">{filteredMatches.length}</span></h2>
          <span>{selectedTeam ? `${selectedTeam.nom} · ${selectedTeam.categoria}` : tr(language, "Historial de partits", "Historial de partidos")}</span>
        </div>
        {pageError && <p className="notice error-text" role="alert">{pageErrorText}</p>}
        {loadingMatches && <p className="notice" role="status">{tr(language, "Carregant partits finalitzats…", "Cargando partidos finalizados…")}</p>}
        {!loadingTeams && !loadingMatches && !pageError && filteredMatches.length === 0 && (
          <div className="empty-state"><span className="empty-mark">—</span><h3>{tr(language, "No hi ha partits per mostrar", "No hay partidos para mostrar")}</h3><p>{tr(language, "Prova una altra temporada o modifica la cerca.", "Prueba otra temporada o modifica la búsqueda.")}</p></div>
        )}
        <div className="match-list">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              expanded={actaState.id === match.id}
              acta={actaState.id === match.id ? actaState : { loading: false, error: "", data: null }}
              onToggle={() => toggleActa(match)}
              language={language}
            />
          ))}
        </div>
      </section>
      )}

      {mode === "pending" && <PendingActas key={teamId} teamId={teamId} team={selectedTeam} language={language} />}

      <footer className="footer"><span>Fundació Terrassa FC 1906</span><span>{tr(language, "Dades de la Federació Catalana de Futbol", "Datos de la Federació Catalana de Futbol")}</span></footer>
    </main>
  );
}
