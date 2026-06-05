import { useState, useEffect } from 'react';
import { getAllEvents } from '../../services/events';
import { getVoteCountsByEvent } from '../../services/votes';
// getBetsByUser ya no se usa directamente — se importa dinámicamente en loadData
import { getAllUsers, getUserById } from '../../services/users';
import { Trophy, Star, Target, DollarSign } from 'lucide-react';
import './Winners.css';

const TABS = [
  { id: 'dinero', label: '💰 Dinero Ganado', icon: DollarSign },
  { id: 'victorias', label: '🏆 Victorias', icon: Trophy },
  { id: 'votos', label: '🎯 Votos Acertados', icon: Target },
];

const Winners = () => {
  const [activeTab, setActiveTab] = useState('dinero');
  const [rankingDinero, setRankingDinero] = useState([]);
  const [rankingVictorias, setRankingVictorias] = useState([]);
  const [rankingVotos, setRankingVotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allEvents = await getAllEvents();
      const finished = allEvents.filter(e => ['finished', 'FINALIZADO', 'completed'].includes(e.status));

      // --- Tab 1: Dinero ganado — usar calculateWinnerPayouts para precisión ---
      // (los status GANADORA/won no se graban automáticamente aún, calculamos desde eventos finalizados)
      const dineroMapFromEvents = {};
      for (const ev of finished) {
        if (!ev.winnerId) continue;
        try {
          const { getBetsByEvent } = await import('../../services/bets');
          const { calculateWinnerPayouts } = await import('../../utils/prizeCalculator');
          const bets = await getBetsByEvent(ev.id).catch(() => []);
          const confirmed = bets.filter(b => b.status === 'confirmed');
          const commission = ev.commissionPercent || ev.houseCommission || 10;
          const rows = calculateWinnerPayouts(confirmed, ev.winnerId, commission);
          for (const row of rows) {
            if (!dineroMapFromEvents[row.userId]) {
              dineroMapFromEvents[row.userId] = { totalGanado: 0, apuestasGanadas: 0 };
            }
            dineroMapFromEvents[row.userId].totalGanado += row.payout;
            dineroMapFromEvents[row.userId].apuestasGanadas++;
          }
        } catch {}
      }
      const dineroWithUser = await Promise.all(
        Object.entries(dineroMapFromEvents)
          .sort(([, a], [, b]) => b.totalGanado - a.totalGanado)
          .slice(0, 20)
          .map(async ([userId, v]) => {
            const u = await getUserById(userId).catch(() => ({ username: userId }));
            return { ...u, ...v };
          })
      );
      setRankingDinero(dineroWithUser);

      // --- Tab 2: Victorias como participante ---
      const victoriasMap = {};
      for (const event of finished) {
        if (event.winnerId) {
          if (!victoriasMap[event.winnerId]) {
            try {
              const u = await getUserById(event.winnerId).catch(() => null);
              if (u) victoriasMap[event.winnerId] = { ...u, victorias: 0, eventTypes: [] };
            } catch {}
          }
          if (victoriasMap[event.winnerId]) {
            victoriasMap[event.winnerId].victorias++;
            if (event.eventType) victoriasMap[event.winnerId].eventTypes.push(event.eventType);
          }
        }
      }
      setRankingVictorias(
        Object.values(victoriasMap)
          .sort((a, b) => b.victorias - a.victorias)
          .slice(0, 20)
      );

      // --- Tab 3: Votos acertados ---
      const votosMap = {};
      for (const event of finished) {
        if (!event.winnerId) continue;
        try {
          const counts = await getVoteCountsByEvent(event.id).catch(() => ({}));
          Object.entries(counts).forEach(([userId, count]) => {
            if (userId === event.winnerId) {
              if (!votosMap[userId]) votosMap[userId] = { aciertos: 0, totalVotos: 0 };
              votosMap[userId].aciertos += count;
            } else {
              if (!votosMap[userId]) votosMap[userId] = { aciertos: 0, totalVotos: 0 };
            }
            if (!votosMap[userId]) votosMap[userId] = { aciertos: 0, totalVotos: 0 };
            votosMap[userId].totalVotos += count;
          });
        } catch {}
      }

      const votosWithUser = await Promise.all(
        Object.entries(votosMap)
          .filter(([, v]) => v.aciertos > 0)
          .sort(([, a], [, b]) => b.aciertos - a.aciertos)
          .slice(0, 20)
          .map(async ([userId, v]) => {
            try {
              const u = await getUserById(userId).catch(() => ({ username: userId }));
              return { ...u, ...v };
            } catch { return { username: userId, ...v }; }
          })
      );
      setRankingVotos(votosWithUser);
    } catch (error) {
      console.error('Error cargando ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const Avatar = ({ user, size = 36 }) => (
    user?.photoURL
      ? <img src={user.photoURL} alt="" style={{ width: size, height: size, borderRadius: '50%', border: '1px solid var(--border-gold)', objectFit: 'cover', flexShrink: 0 }} />
      : <div style={{ width: size, height: size, borderRadius: '50%', border: '1px solid var(--border-gold)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: size * 0.38, color: 'var(--gold-primary)', flexShrink: 0 }}>
          {(user?.username || '?')[0].toUpperCase()}
        </div>
  );

  const RankNumber = ({ i }) => {
    if (i === 0) return <span style={{ fontSize: '1.4rem' }}>🥇</span>;
    if (i === 1) return <span style={{ fontSize: '1.3rem' }}>🥈</span>;
    if (i === 2) return <span style={{ fontSize: '1.2rem' }}>🥉</span>;
    return <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', minWidth: 28, textAlign: 'center' }}>#{i + 1}</span>;
  };

  return (
    <div className="winners-page">
      <div className="winners-header">
        <h1><Trophy size={20} /> Ranking</h1>
      </div>

      {/* Tabs */}
      <div className="winners-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`winners-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="winners-loading">Cargando ranking...</div>
      ) : (
        <div className="winners-content">
          {/* Tab 1 — Dinero */}
          {activeTab === 'dinero' && (
            <div className="ranking-list">
              {rankingDinero.length === 0 ? (
                <div className="ranking-empty"><DollarSign size={36} /><p>Aún no hay apuestas ganadoras</p></div>
              ) : rankingDinero.map((u, i) => (
                <div key={u.id || i} className="ranking-row">
                  <RankNumber i={i} />
                  <Avatar user={u} />
                  <div className="ranking-info">
                    <span className="ranking-name">{u.username}</span>
                    <span className="ranking-sub">{u.apuestasGanadas} apuesta{u.apuestasGanadas !== 1 ? 's' : ''} ganada{u.apuestasGanadas !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="ranking-value gold">${u.totalGanado.toFixed(0)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2 — Victorias */}
          {activeTab === 'victorias' && (
            <div className="ranking-list">
              {rankingVictorias.length === 0 ? (
                <div className="ranking-empty"><Trophy size={36} /><p>Aún no hay ganadores de eventos</p></div>
              ) : rankingVictorias.map((u, i) => (
                <div key={u.id || i} className="ranking-row">
                  <RankNumber i={i} />
                  <Avatar user={u} />
                  <div className="ranking-info">
                    <span className="ranking-name">{u.username}</span>
                    {u.eventTypes?.length > 0 && (
                      <span className="ranking-sub">
                        {[...new Set(u.eventTypes)].join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="ranking-value">
                    <Trophy size={14} style={{ color: 'var(--gold-primary)' }} />
                    {u.victorias}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3 — Votos acertados */}
          {activeTab === 'votos' && (
            <div className="ranking-list">
              {rankingVotos.length === 0 ? (
                <div className="ranking-empty"><Target size={36} /><p>Sin datos de votos acertados aún</p></div>
              ) : rankingVotos.map((u, i) => (
                <div key={u.id || i} className="ranking-row">
                  <RankNumber i={i} />
                  <Avatar user={u} />
                  <div className="ranking-info">
                    <span className="ranking-name">{u.username}</span>
                    <span className="ranking-sub">{u.totalVotos} votos totales</span>
                  </div>
                  <div className="ranking-value">
                    <Target size={13} style={{ color: 'var(--gold-primary)' }} />
                    {u.aciertos} aciertos
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Winners;
