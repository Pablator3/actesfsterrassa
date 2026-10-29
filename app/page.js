"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Image from "next/image";

const CREST_URL = "https://files.fcf.cat/escudos/clubes/escudos/";
const CLUB_CREST = `${CREST_URL}00100_0000988633_TERRASSAFCnou.png`;

function currentSeason() {
  const today = new Date();
  const start = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return { value: `${start}/${String(start + 1).slice(-2)}`, label: `${start} / ${start + 1}` };
}

const CURRENT_SEASON = currentSeason();

function displayDate(value, options = {}) {
  const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "Fecha pendiente";
  return new Intl.DateTimeFormat("es-ES", options).format(new Date(year, month - 1, day));
}

function seasonFor(date) {
  const [year, month] = String(date || "").slice(0, 7).split("-").map(Number);
  if (!year || !month) return "Temporada desconocida";
  const start = month >= 7 ? year : year - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
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

function SideRoster({ title, players }) {
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
            {(player.portero === 1 || player.portero === "1" || player.portero === true) && <small className="goalkeeper-badge">Portero</small>}
          </li>
        ))}
      </ol>
    </details>
  );
}

function ActaDetails({ acta, sanciones = [] }) {
  const home = acta.equipo_local?.NOMBRE_EQUIPO || "Local";
  const away = acta.equipo_visitante?.NOMBRE_EQUIPO || "Visitante";
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
        <span>{acta.nombre_competicion || acta.nombre_grupo || "Competición FCF"}</span>
        <span>{acta.temporada_nombre || ""}{acta.JORNADA ? ` · Jornada ${acta.JORNADA}` : ""}</span>
        <span>{acta.CAMPO || "Pabellón no informado"}</span>
      </div>
      <div className="acta-columns">
        <section className="acta-section">
          <h3>Goles <span>{goals.length}</span></h3>
          {goals.length ? (
            <ul className="event-list">
              {goals.map((event, index) => (
                <li key={`${event.id_jugador}-${event.minuto}-${index}`}>
                  <strong>{event.minuto || "–"}&apos;</strong>
                  {event.escudo && <Image className="event-crest" src={crestUrl(event.escudo)} alt={`Escudo de ${event.team}`} width={20} height={20} unoptimized />}
                  <span>
                    {event.nombre_jugador || "Jugador"}
                    <small>{event.team}</small>
                    {(sanctionsByPlayer.get(String(event.id_jugador || "")) || []).map((sanction, sanctionIndex) => (
                      <small className="sanction-label" key={`${sanction.articulo_salida}-${sanctionIndex}`}>
                        {sanction.matches} {sanction.matches === 1 ? "partido" : "partidos"} de sanción
                        {sanction.articulo_salida ? ` · Art. ${sanction.articulo_salida}` : ""}
                      </small>
                    ))}
                  </span>
                  <b>{event.dorsal ? `#${event.dorsal}` : ""}</b>
                </li>
              ))}
            </ul>
          ) : <p className="empty-note">Sin goles detallados.</p>}
        </section>
        <section className="acta-section">
          <h3>Tarjetas <span>{cards.length}</span></h3>
          <div className="card-counts" aria-label={`${yellowCardCount} amarillas, ${redCardCount} expulsiones`}>
            <span className="yellow-count">{yellowCardCount} amarillas</span>
            <span className="count-divider" aria-hidden="true" />
            <span className="red-count">{redCardCount} expulsiones</span>
          </div>
          {cards.length ? (
            <ul className="event-list">
              {cards.map((event, index) => (
                <li key={`${event.id_jugador}-${event.minuto}-${index}`}>
                  <strong>{event.minuto || "–"}&apos;</strong>
                  {event.escudo && <Image className="event-crest" src={crestUrl(event.escudo)} alt={`Escudo de ${event.team}`} width={20} height={20} unoptimized />}
                  <span>{event.nombre_jugador || "Jugador"}<small>{event.team}</small></span>
                  {isSecondYellow(event) ? (
                    <span className="card-pair" role="img" aria-label="Expulsión por segunda tarjeta amarilla" title="Expulsión por segunda tarjeta amarilla">
                      <span className="card-shape" aria-hidden="true" />
                      <span className="card-shape is-red" aria-hidden="true" />
                    </span>
                  ) : isRedCard(event) ? (
                    <span className="card-shape is-red" role="img" aria-label="Tarjeta roja" title="Tarjeta roja" />
                  ) : (
                    <span className="card-shape" role="img" aria-label="Tarjeta amarilla" title="Tarjeta amarilla" />
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="empty-note">Sin tarjetas registradas.</p>}
        </section>
        <section className="acta-section">
          <h3>Arbitraje <span>{officials.length}</span></h3>
          {officials.length ? (
            <ul className="official-list">
              {officials.map((official, index) => (
                <li key={official.CODARBITRO || index}>
                  <span>{official.nombre_arbitro}</span><small>{official.rol || "Árbitro"}</small>
                </li>
              ))}
            </ul>
          ) : <p className="empty-note">Sin arbitraje publicado.</p>}
        </section>
      </div>
      <div className="roster-grid">
        <SideRoster title={`Plantilla local · ${home}`} players={acta.jugadores_equipo_local} />
        <SideRoster title={`Plantilla visitante · ${away}`} players={acta.jugadores_equipo_visitante} />
      </div>
      <p className="acta-source">Acta y sanciones consultadas en la Federació Catalana de Futbol.</p>
    </div>
  );
}

function MatchCard({ match, expanded, acta, onToggle }) {
  return (
    <article className={`match-card${expanded ? " is-expanded" : ""}`}>
      <div className="match-row">
        <div className="match-date">
          <strong>{displayDate(match.data, { day: "2-digit" })}</strong>
          <span>{displayDate(match.data, { month: "short" }).replace(".", "")}</span>
        </div>
        <div className="match-main">
          <div className="match-context">
            <span>{match.jornada ? `Jornada ${match.jornada}` : "Partido finalizado"}</span>
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
          {expanded ? "Cerrar acta" : "Ver acta"}
        </button>
      </div>
      {expanded && (
        <div className="acta-wrap" aria-live="polite">
          {acta.loading && <p className="inline-status">Cargando el acta…</p>}
          {acta.error && <p className="inline-status error-text">{acta.error}</p>}
          {acta.data && <ActaDetails acta={acta.data} sanciones={acta.sanciones} />}
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [matches, setMatches] = useState([]);
  const [season, setSeason] = useState(CURRENT_SEASON.value);
  const [query, setQuery] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actaState, setActaState] = useState({ id: "", loading: false, error: "", data: null });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/equips", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los equipos.");
        const nextTeams = payload.equips || [];
        setTeams(nextTeams);
        setTeamId(nextTeams[0]?.id || "");
        setLoadingMatches(nextTeams.length > 0);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setPageError(error.message || "No se pudieron cargar los equipos.");
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
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los partidos.");
        setMatches(payload.partits || []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setPageError(error.message || "No se pudieron cargar los partidos.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMatches(false);
      });
    return () => controller.abort();
  }, [teamId]);

  const seasons = [...new Set([CURRENT_SEASON.value, ...matches.map((match) => match.temporada)])]
    .sort((a, b) => b.localeCompare(a));
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("es");
  const filteredMatches = matches.filter((match) => {
    const matchesSeason = season === "all" || match.temporada === season;
    const matchesQuery = !normalizedQuery || `${match.local} ${match.visitant} ${match.competicio}`.toLocaleLowerCase("es").includes(normalizedQuery);
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
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el acta.");
      setActaState({ id: match.id, loading: false, error: "", data: payload.acta, sanciones: payload.sanciones || [] });
    } catch (error) {
      setActaState({ id: match.id, loading: false, error: error.message || "No se pudo cargar el acta.", data: null });
    }
  }

  const selectedTeam = teams.find((team) => team.id === teamId);

  return (
    <main className="shell">
      <header className="masthead">
        <Image className="club-logo" src={CLUB_CREST} alt="Escudo de la Fundació Terrassa FC 1906" width={54} height={54} unoptimized />
        <div className="brand">
          <p>Fundació Terrassa FC 1906</p>
          <span>Fútbol sala · Archivo de partidos</span>
        </div>
        <div className="season-mark"><span>Temporada actual</span><strong>{CURRENT_SEASON.label}</strong></div>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">PARTIDOS FINALIZADOS <span>·</span> FCF</p>
          <h1>Actas de partido</h1>
          <p className="heading-copy">Busca partidos finalizados y consulta el acta desde cada encuentro.</p>
        </div>
        <div className="archive-count"><strong>{matches.length}</strong><span>partidos<br />finalizados</span></div>
      </section>

      <section className="filters" aria-label="Filtros de partidos">
        <div className="filter-field team-filter">
          <label htmlFor="team-select">Equipo</label>
          <select id="team-select" value={teamId} disabled={loadingTeams || !teams.length} onChange={(event) => {
            setLoadingMatches(Boolean(event.target.value));
            setPageError("");
            setMatches([]);
            setSeason(CURRENT_SEASON.value);
            setActaState({ id: "", loading: false, error: "", data: null });
            setTeamId(event.target.value);
          }}>
            {loadingTeams && <option value="">Cargando equipos…</option>}
            {!loadingTeams && !teams.length && <option value="">No hay equipos disponibles</option>}
            {teams.map((team) => <option key={team.id} value={team.id}>{team.etiqueta}</option>)}
          </select>
        </div>
        <div className="filter-field season-filter">
          <label htmlFor="season-select">Temporada</label>
          <select id="season-select" value={season} onChange={(event) => setSeason(event.target.value)} disabled={!seasons.length}>
            <option value="all">Todas las temporadas</option>
            {seasons.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="filter-field search-filter">
          <label htmlFor="match-search">Rival o competición</label>
          <input id="match-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar partido…" />
        </div>
        <div className="filter-total"><strong>{filteredMatches.length}</strong><span>resultados</span></div>
      </section>

      <section className="results" aria-labelledby="results-heading">
        <div className="results-heading">
          <h2 id="results-heading">{selectedTeam?.nom || "Partidos"}</h2>
          <span>{selectedTeam?.categoria || "Historial de partidos"}</span>
        </div>
        {pageError && <p className="notice error-text" role="alert">{pageError}</p>}
        {loadingMatches && <p className="notice" role="status">Cargando partidos finalizados…</p>}
        {!loadingTeams && !loadingMatches && !pageError && filteredMatches.length === 0 && (
          <div className="empty-state"><span className="empty-mark">—</span><h3>No hay partidos para mostrar</h3><p>Prueba otra temporada o modifica la búsqueda.</p></div>
        )}
        <div className="match-list">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              expanded={actaState.id === match.id}
              acta={actaState.id === match.id ? actaState : { loading: false, error: "", data: null }}
              onToggle={() => toggleActa(match)}
            />
          ))}
        </div>
      </section>

      <footer className="footer"><span>Fundació Terrassa FC 1906</span><span>Datos de la Federació Catalana de Futbol</span></footer>
    </main>
  );
}
