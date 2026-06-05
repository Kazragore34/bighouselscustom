import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllEvents, createEvent, updateEvent, deleteEvent,
  getEventParticipants, addParticipantsToEvent, closeParticipantsList,
  getEventById, setEventWinner, setEventWinners
} from '../../services/events';
import { generateSmartBrackets } from '../../services/brackets';
import { getAllUsers, getUserById } from '../../services/users';
import { getBetsByEvent } from '../../services/bets';
import { fileToBase64 } from '../../utils/imageUtils';
import { Plus, Edit, Trash2, Users, Trophy, X, Lock, Play } from 'lucide-react';
import ParticipantsModal from './ParticipantsModal';
import WinnerSelectModal from './WinnerSelectModal';
import './admin-shared.css';
import './EventManagement.css';

const EVENT_TYPES = [
  { value: 'CARRERA_COCHES', label: '🚗 Carrera de Coches' },
  { value: 'PELEA_COMBATE', label: '🥊 Pelea / Combate' },
  { value: 'DISPAROS', label: '🎯 Disparos' },
  { value: 'CARRERA_PIE', label: '🏃 Carrera a Pie / Parkour' },
  { value: 'POSTA_EQUIPOS', label: '🏁 Posta por Equipos' },
  { value: 'ROL_LIBRE', label: '🎭 Rol Libre' },
];

const COMPETITION_MODES = [
  { value: 'CARRERA_CLASICA', label: 'A — Carrera Clásica (posiciones finales)' },
  { value: 'ELIMINACION_PROGRESIVA', label: 'B — Eliminación Progresiva (rondas con eliminados)' },
  { value: 'BRACKET_TORNEO', label: 'C — Bracket Torneo (eliminación directa 1v1)' },
  { value: 'MULTI_FASE', label: 'D — Multi-Fase (clasificatorias + final)' },
  { value: 'RONDAS_INDEPENDIENTES', label: 'E — Rondas Independientes (ej. carros chocones)' },
];

const STATUSES = [
  { value: 'BORRADOR',   label: 'Borrador'   },
  { value: 'ACTIVO',     label: 'Activo'     },
  { value: 'EN_CURSO',   label: 'En Curso'   },
  { value: 'POSPUESTO',  label: 'Pospuesto'  },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO',  label: 'Cancelado'  },
];

const STATUS_LABEL = {
  BORRADOR: 'Borrador', draft: 'Borrador',
  ACTIVO: 'Activo', active: 'Activo',
  EN_CURSO: 'En Curso',
  POSPUESTO: 'Pospuesto',
  FINALIZADO: 'Finalizado', finished: 'Finalizado',
  CANCELADO: 'Cancelado', cancelled: 'Cancelado',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  eventType: 'CARRERA_COCHES',
  competitionMode: 'BRACKET_TORNEO',
  isTeamEvent: false,
  teamSize: 1,
  status: 'BORRADOR',
  bannerURL: '',
  bannerFile: null,
  betDeadline: '',
  maxBetPerUser: 0,
  commissionPercent: 10,
  totalWinners: 1,
  maxRounds: 5,
  totalPhases: 2,
  // legacy compat
  houseCommission: 10,
  participantsPerBracket: 2,
};

const EventManagement = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [currentEventForParticipants, setCurrentEventForParticipants] = useState(null);
  const [eventTotals, setEventTotals] = useState({});
  const [winnerModal, setWinnerModal] = useState({ open: false, event: null, participants: [] });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, usersData] = await Promise.all([getAllEvents(), getAllUsers()]);
      setEvents(eventsData);
      // Participantes = usuarios con rol PARTICIPANTE o APOSTADOR (no PENDIENTE)
      setUsers(usersData.filter(u => u.enabled !== false && ['PARTICIPANTE', 'APOSTADOR', 'VOTANTE_APOSTADOR', 'ADMIN'].includes(u.userType || u.role)));

      const totals = {};
      for (const ev of eventsData) {
        try {
          const bets = await getBetsByEvent(ev.id);
          const confirmed = bets.filter(b => b.status === 'confirmed');
          totals[ev.id] = {
            totalBets: confirmed.reduce((s, b) => s + (b.amount || 0), 0),
            confirmedCount: confirmed.length,
            pendingCount: bets.filter(b => b.status === 'pending').length,
          };
        } catch { totals[ev.id] = { totalBets: 0, confirmedCount: 0, pendingCount: 0 }; }
      }
      setEventTotals(totals);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagen demasiado grande (máx 2MB)'); return; }
    try {
      setUploading(true);
      const base64 = await fileToBase64(file);
      setFormData(f => ({ ...f, bannerURL: base64, bannerFile: file }));
    } catch { alert('Error procesando imagen'); }
    finally { setUploading(false); }
  };

  const handleCreateEvent = async () => {
    try {
      if (!formData.name) { alert('El nombre del evento es obligatorio'); return; }
      const { bannerFile, ...data } = formData;
      // Mantener compatibilidad con campos legacy
      data.houseCommission = data.commissionPercent;
      const eventId = await createEvent(data);
      if (selectedParticipants.length > 0) await addParticipantsToEvent(eventId, selectedParticipants);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      alert(error.message || 'Error al crear evento');
    }
  };

  const handleEditEvent = async (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name || '',
      description: event.description || '',
      eventType: event.eventType || 'CARRERA_COCHES',
      competitionMode: event.competitionMode || (event.bracketType === '1v1' ? 'BRACKET_TORNEO' : 'CARRERA_CLASICA'),
      isTeamEvent: event.isTeamEvent || false,
      teamSize: event.teamSize || 1,
      status: event.status || 'BORRADOR',
      bannerURL: event.bannerURL || '',
      bannerFile: null,
      betDeadline: event.betDeadline || '',
      maxBetPerUser: event.maxBetPerUser || 0,
      commissionPercent: event.commissionPercent || event.houseCommission || 10,
      totalWinners: event.totalWinners || 1,
      maxRounds: event.maxRounds || 5,
      totalPhases: event.totalPhases || 2,
      houseCommission: event.houseCommission || 10,
      participantsPerBracket: event.participantsPerBracket || 2,
    });
    try {
      const parts = await getEventParticipants(event.id);
      const withData = await Promise.all(parts.map(async p => {
        try { return { ...p, ...await getUserById(p.userId) }; }
        catch { return { ...p, username: p.userId }; }
      }));
      setEventParticipants(withData);
    } catch { setEventParticipants([]); }
    setShowModal(true);
  };

  const handleUpdateEvent = async () => {
    try {
      const { bannerFile, ...data } = formData;
      data.houseCommission = data.commissionPercent;
      await updateEvent(editingEvent.id, data);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      alert(error.message || 'Error al actualizar evento');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Eliminar este evento? Se eliminarán también participantes, apuestas y brackets.')) return;
    try {
      await deleteEvent(eventId);
      loadData();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleGenerateBracket = async (event) => {
    if (!confirm('¿Generar bracket oficial? Esto sobreescribirá cualquier bracket existente y será visible para todos los usuarios.')) return;
    try {
      const parts = await getEventParticipants(event.id);
      const withData = await Promise.all(parts.map(async p => {
        try { return { ...p, ...await getUserById(p.userId) }; }
        catch { return { ...p, username: p.userId }; }
      }));
      await closeParticipantsList(event.id);
      await generateSmartBrackets(event.id, withData, event.bracketType || '1v1', event.participantsPerBracket || 2);
      alert('Bracket generado y guardado en Firestore. Todos los usuarios verán la misma estructura.');
      loadData();
    } catch (error) {
      alert('Error generando bracket: ' + error.message);
    }
  };

  const handleSetWinner = async (event) => {
    if (event.competitionMode === 'RONDAS_INDEPENDIENTES') {
      alert('Este evento usa Rondas Independientes. Usa el botón "Panel" para gestionar los ganadores por ronda.');
      return;
    }
    try {
      const parts = await getEventParticipants(event.id);
      const withData = await Promise.all(parts.map(async p => {
        try { return { ...p, ...await getUserById(p.userId) }; }
        catch { return { ...p, username: 'Desconocido' }; }
      }));
      setWinnerModal({ open: true, event, participants: withData });
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleConfirmWinner = async (winners) => {
    // winners es array [{ userId, username, position }]
    const { event } = winnerModal;
    setWinnerModal({ open: false, event: null, participants: [] });
    try {
      await setEventWinners(event.id, winners);
      await updateEvent(event.id, { status: 'FINALIZADO' });
      loadData();
    } catch (error) {
      alert('Error al establecer ganador: ' + error.message);
    }
  };

  const handleFinalizeEvent = async (event) => {
    if (!confirm(`¿Finalizar el evento "${event.name}"? Cambiará su estado a FINALIZADO y ya no se podrá apostar.`)) return;
    try {
      await updateEvent(event.id, { status: 'FINALIZADO' });
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setSelectedParticipants([]);
    setEditingEvent(null);
  };

  const set = (field, value) => setFormData(f => ({ ...f, [field]: value }));

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando eventos...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Gestión de <span>Eventos</span></h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-add">
          <Plus size={16} /> Crear Evento
        </button>
      </div>

      <div className="events-admin-grid">
        {events.map(event => {
          const tot = eventTotals[event.id];
          const statusLabel = STATUS_LABEL[event.status] || event.status;
          return (
            <div key={event.id} className="event-admin-card">
              {event.bannerURL && (
                <div className="event-admin-banner" style={{ backgroundImage: `url(${event.bannerURL})` }} />
              )}
              <div className="event-admin-body">
                <div className="event-admin-meta">
                  <span className={`status-badge status-${event.status}`}>{statusLabel}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {event.competitionMode || event.bracketType || '—'}
                  </span>
                </div>
                <h3 className="event-admin-title">{event.name}</h3>
                {event.description && <p className="event-admin-desc">{event.description}</p>}
                <div className="event-admin-stats">
                  <span>💰 ${tot?.totalBets?.toFixed(0) || '0'}</span>
                  <span>✓ {tot?.confirmedCount || 0} confirmadas</span>
                  <span>⏳ {tot?.pendingCount || 0} pendientes</span>
                </div>
                <div className="table-actions" style={{ flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  <button className="btn-table-action btn-table-edit" onClick={() => handleEditEvent(event)}>
                    <Edit size={12} /> Editar
                  </button>
                  <button
                    className="btn-table-action btn-table-neutral"
                    onClick={() => navigate(`/admin/eventos/${event.id}`)}
                  >
                    <Play size={12} /> Panel
                  </button>
                  <button
                    className="btn-table-action btn-table-neutral"
                    onClick={async () => {
                      const parts = await getEventParticipants(event.id).catch(() => []);
                      const withData = await Promise.all(parts.map(async p => {
                        try { return { ...p, ...await getUserById(p.userId) }; }
                        catch { return { ...p, username: p.userId }; }
                      }));
                      setEventParticipants(withData);
                      setCurrentEventForParticipants(event);
                      setShowParticipantsModal(true);
                    }}
                  >
                    <Users size={12} /> Participantes
                  </button>
                  {/* Brackets solo para modos que lo necesitan */}
                  {['BRACKET_TORNEO', 'MULTI_FASE', '1v1', '2v2'].includes(event.competitionMode || event.bracketType) && (
                    <>
                      <button
                        className="btn-table-action btn-table-neutral"
                        onClick={() => navigate(`/admin/events/${event.id}/brackets`)}
                      >
                        <Trophy size={12} /> Brackets
                      </button>
                      {!event.participantsListClosed && (
                        <button className="btn-table-action btn-table-success" onClick={() => handleGenerateBracket(event)}>
                          <Lock size={12} /> Generar
                        </button>
                      )}
                    </>
                  )}
                  {/* Ganador solo si no es Modo E y el evento está activo/en curso */}
                  {event.competitionMode !== 'RONDAS_INDEPENDIENTES' &&
                   ['active', 'ACTIVO', 'EN_CURSO'].includes(event.status) && (
                    <button
                      className="btn-table-action btn-table-success"
                      onClick={() => handleSetWinner(event)}
                      title={event.winnerId ? 'Ya tiene ganador — clic para cambiar' : 'Declarar ganador'}
                    >
                      <Trophy size={12} /> {event.winnerId ? '✓ Ganador' : 'Ganador'}
                    </button>
                  )}
                  {/* Finalizar evento */}
                  {!['FINALIZADO', 'finished', 'CANCELADO'].includes(event.status) && (
                    <button
                      className="btn-table-action btn-table-danger"
                      onClick={() => handleFinalizeEvent(event)}
                      title="Finalizar evento (sin eliminar)"
                      style={{ borderColor: 'rgba(122,107,45,0.5)', color: '#D4A44C' }}
                    >
                      Finalizar
                    </button>
                  )}
                  <button className="btn-table-action btn-table-danger" onClick={() => handleDeleteEvent(event.id)} title="Eliminar evento">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          No hay eventos. Crea el primero.
        </div>
      )}

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="admin-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <h2>{editingEvent ? 'Editar Evento' : 'Crear Evento'}</h2>

            {/* Sección 1 — Info básica */}
            <div style={{ marginBottom: 6, fontSize: '0.75rem', color: 'var(--gold-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Información Básica</div>

            <div className="form-group">
              <label>Nombre del Evento *</label>
              <input type="text" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del evento" />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea value={formData.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Descripción breve" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Tipo de Evento</label>
                <select value={formData.eventType} onChange={e => set('eventType', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={formData.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Banner (URL externa — Imgur, ImgBB, etc.)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={formData.bannerURL}
                  onChange={e => set('bannerURL', e.target.value)}
                  placeholder="https://i.imgur.com/..."
                  style={{ flex: 1 }}
                />
                <label style={{ cursor: 'pointer', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-gold)', color: 'var(--text-secondary)', borderRadius: 7, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {uploading ? '...' : 'Subir'}
                  <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
                </label>
              </div>
              {formData.bannerURL && (
                <img src={formData.bannerURL} alt="preview" style={{ marginTop: 8, width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-gold)' }} onError={e => e.target.style.display = 'none'} />
              )}
            </div>

            {/* Sección 2 — Formato */}
            <div style={{ marginBottom: 6, marginTop: 16, fontSize: '0.75rem', color: 'var(--gold-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Formato de Competencia</div>

            <div className="form-group">
              <label>Modo de Competencia</label>
              <select value={formData.competitionMode} onChange={e => set('competitionMode', e.target.value)}>
                {COMPETITION_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexDirection: 'row' }}>
                  <input type="checkbox" checked={formData.isTeamEvent} onChange={e => set('isTeamEvent', e.target.checked)} style={{ width: 'auto', padding: 0 }} />
                  <span>Evento por equipos</span>
                </label>
                {formData.isTeamEvent && (
                  <select value={formData.teamSize} onChange={e => set('teamSize', parseInt(e.target.value))} style={{ marginTop: 6 }}>
                    <option value={2}>2v2</option>
                    <option value={3}>3v3</option>
                    <option value={4}>4v4</option>
                    <option value={1}>Personalizado</option>
                  </select>
                )}
              </div>

              {formData.competitionMode !== 'RONDAS_INDEPENDIENTES' && (
                <div className="form-group">
                  <label>Nº de Ganadores</label>
                  <input type="number" min={1} value={formData.totalWinners} onChange={e => set('totalWinners', parseInt(e.target.value))} />
                </div>
              )}

              {formData.competitionMode === 'RONDAS_INDEPENDIENTES' && (
                <div className="form-group">
                  <label>Rondas Máx. (estimado)</label>
                  <input type="number" min={1} value={formData.maxRounds} onChange={e => set('maxRounds', parseInt(e.target.value))} />
                </div>
              )}

              {formData.competitionMode === 'MULTI_FASE' && (
                <div className="form-group">
                  <label>Nº de Fases</label>
                  <input type="number" min={2} value={formData.totalPhases} onChange={e => set('totalPhases', parseInt(e.target.value))} />
                </div>
              )}
            </div>

            {/* Sección 3 — Apuestas */}
            <div style={{ marginBottom: 6, marginTop: 16, fontSize: '0.75rem', color: 'var(--gold-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Configuración de Apuestas</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Comisión casa (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={formData.commissionPercent} onChange={e => set('commissionPercent', parseFloat(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Límite máx. por usuario (0=sin límite)</label>
                <input type="number" min={0} value={formData.maxBetPerUser} onChange={e => set('maxBetPerUser', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="form-group">
              <label>Fecha/hora límite de apuestas</label>
              <input type="datetime-local" value={formData.betDeadline || ''} onChange={e => set('betDeadline', e.target.value)} />
            </div>

            {/* Participantes en creación */}
            {!editingEvent && users.length > 0 && (
              <>
                <div style={{ marginBottom: 6, marginTop: 16, fontSize: '0.75rem', color: 'var(--gold-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Participantes (opcional)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 140, overflowY: 'auto', padding: 8, background: 'var(--bg-secondary)', borderRadius: 7, border: '1px solid var(--border-gold)' }}>
                  {users.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(u.id)}
                        onChange={e => setSelectedParticipants(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                        style={{ width: 'auto', padding: 0 }}
                      />
                      {u.username}
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* Participantes en edición */}
            {editingEvent && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Participantes ({eventParticipants.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {eventParticipants.map(p => (
                    <span key={p.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-gold)', borderRadius: 20, padding: '2px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {p.username || p.name}
                    </span>
                  ))}
                  {eventParticipants.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin participantes</span>}
                </div>
                <button
                  type="button"
                  onClick={() => { setCurrentEventForParticipants(editingEvent); setShowParticipantsModal(true); }}
                  className="btn-table-action btn-table-edit"
                  style={{ padding: '7px 14px' }}
                >
                  <Users size={13} /> Gestionar Participantes
                </button>
              </div>
            )}

            <div className="admin-modal-footer">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-cancel">Cancelar</button>
              <button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent} className="btn-save" disabled={uploading}>
                {uploading ? 'Subiendo...' : editingEvent ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ParticipantsModal
        event={currentEventForParticipants}
        isOpen={showParticipantsModal}
        onClose={() => { setShowParticipantsModal(false); setCurrentEventForParticipants(null); setSelectedParticipants([]); }}
        onUpdate={loadData}
      />

      <WinnerSelectModal
        isOpen={winnerModal.open}
        onClose={() => setWinnerModal({ open: false, event: null, participants: [] })}
        onConfirm={handleConfirmWinner}
        participants={winnerModal.participants}
        eventName={winnerModal.event?.name || ''}
        maxWinners={winnerModal.event?.totalWinners || 1}
      />
    </div>
  );
};

export default EventManagement;
