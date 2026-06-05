import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getAvailableTeamsForEvent } from '../../services/teams';
import { addParticipantsToEvent, addTeamToEvent, getEventParticipants, removeParticipantsFromEvent } from '../../services/events';
import { getAllUsers } from '../../services/users';
import { Search, X, Plus, Trash2 } from 'lucide-react';
import './ParticipantsModal.css';

const ParticipantsModal = ({ event, isOpen, onClose, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setSelectedUserIds(new Set());
      setEventParticipants([]);
      setTeams([]);
      loadData();
    } else if (!isOpen) {
      setSelectedUserIds(new Set());
      setEventParticipants([]);
      setTeams([]);
      setSearchTerm('');
    }
  }, [isOpen, event]);

  const loadData = async () => {
    try {
      setLoading(true);
      const isTeamEvent = event.isTeamEvent || event.bracketType === '2v2' || event.bracketType === 'custom';
      const requiredMembers = event.teamSize || event.participantsPerBracket || 2;

      const [usersData, participantsData] = await Promise.all([
        getAllUsers(),
        getEventParticipants(event.id)
      ]);

      // Aceptar APOSTADOR, PARTICIPANTE, VOTANTE_APOSTADOR y ADMIN como posibles participantes
      const ALLOWED_ROLES = ['APOSTADOR', 'PARTICIPANTE', 'VOTANTE_APOSTADOR', 'ADMIN'];
      const participantUsers = usersData.filter(u =>
        u.enabled !== false && ALLOWED_ROLES.includes(u.userType || u.role)
      );
      const usersMap = new Map(participantUsers.map(u => [u.id, u]));
      setUsers(participantUsers);

      const participantsWithData = participantsData.map(p => {
        const ud = usersMap.get(p.userId);
        return ud ? { ...p, ...ud } : { ...p, username: 'Usuario no encontrado' };
      });
      setEventParticipants(participantsWithData);

      if (!isTeamEvent) {
        setSelectedUserIds(new Set(participantsData.map(p => p.userId).filter(Boolean)));
      }

      if (isTeamEvent) {
        const teamsData = await getAvailableTeamsForEvent(requiredMembers).catch(() => []);
        setAvailableTeams(teamsData);
        const existingTeams = groupIntoTeams(participantsWithData, requiredMembers);
        setTeams(existingTeams.length > 0 ? existingTeams : [{ id: 'team-1', name: 'Equipo 1', members: [] }]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupIntoTeams = (participants, size) => {
    const result = [];
    for (let i = 0; i < participants.length; i += size) {
      const slice = participants.slice(i, i + size);
      if (slice.length === size) {
        result.push({ id: `team-${result.length + 1}`, name: `Equipo ${result.length + 1}`, members: slice.map(p => p.userId) });
      }
    }
    return result;
  };

  const assignedUserIds = useMemo(() => {
    const s = new Set();
    teams.forEach(t => t.members.forEach(id => s.add(id)));
    eventParticipants.forEach(p => s.add(p.userId));
    return s;
  }, [teams, eventParticipants]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return users.filter(u =>
      !assignedUserIds.has(u.id) &&
      (u.username?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q))
    );
  }, [users, assignedUserIds, searchTerm]);

  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const isTeam = event.isTeamEvent || event.bracketType === '2v2';
    if (!isTeam) return;
    const required = event.teamSize || event.participantsPerBracket || 2;

    if (source.droppableId === 'available-users') {
      setTeams(prev => prev.map(t => {
        if (t.id === destination.droppableId && !t.members.includes(draggableId) && t.members.length < required) {
          return { ...t, members: [...t.members, draggableId] };
        }
        return t;
      }));
    } else if (source.droppableId.startsWith('team-') && destination.droppableId.startsWith('team-') && source.droppableId !== destination.droppableId) {
      setTeams(prev => prev.map(t => {
        if (t.id === source.droppableId) return { ...t, members: t.members.filter(id => id !== draggableId) };
        if (t.id === destination.droppableId && t.members.length < required) return { ...t, members: [...t.members, draggableId] };
        return t;
      }));
    } else if (source.droppableId.startsWith('team-') && destination.droppableId === 'remove-zone') {
      setTeams(prev => prev.map(t => t.id === source.droppableId ? { ...t, members: t.members.filter(id => id !== draggableId) } : t));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const isTeam = event.isTeamEvent || event.bracketType === '2v2';

      if (isTeam) {
        const toAdd = [];
        teams.forEach(t => t.members.forEach(uid => toAdd.push({ userId: uid, teamId: t.id })));
        if (toAdd.length > 0) await addParticipantsToEvent(event.id, toAdd);
      } else {
        const current = new Set(eventParticipants.map(p => p.userId));
        const toAdd = [...selectedUserIds].filter(id => !current.has(id)).map(id => ({ userId: id }));
        const toRemove = [...current].filter(id => !selectedUserIds.has(id));
        if (toAdd.length > 0) await addParticipantsToEvent(event.id, toAdd);
        if (toRemove.length > 0) await removeParticipantsFromEvent(event.id, toRemove);
      }

      await loadData();
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isTeamEvent = event.isTeamEvent || event.bracketType === '2v2' || event.bracketType === 'custom';
  const required = event.teamSize || event.participantsPerBracket || 2;

  const Avatar = ({ user }) => user?.photoURL
    ? <img src={user.photoURL} alt="" />
    : <div className="pm-chip-avatar">{(user?.username || '?')[0].toUpperCase()}</div>;

  return (
    <div className="participants-modal-overlay" onClick={onClose}>
      <div className="participants-modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-header">
          <h2>Participantes — {event.name}</h2>
          <button onClick={onClose} className="pm-close"><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="pm-body">
              {/* Columna izquierda */}
              <div className="pm-left">
                {!isTeamEvent ? (
                  <>
                    <p className="pm-section-title">Participantes actuales ({selectedUserIds.size})</p>
                    <div className="pm-current-participants">
                      {eventParticipants.length === 0
                        ? <span className="pm-no-participants">Sin participantes. Selecciona usuarios de la derecha.</span>
                        : eventParticipants.map(p => (
                          <div key={p.id} className="pm-participant-chip">
                            <Avatar user={p} />
                            <span>{p.username || p.name}</span>
                          </div>
                        ))
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pm-teams-header">
                      <p className="pm-section-title" style={{ margin: 0 }}>Equipos ({teams.length})</p>
                      <button
                        className="btn-table-action btn-table-edit"
                        style={{ padding: '5px 12px' }}
                        onClick={() => setTeams(t => [...t, { id: `team-${Date.now()}`, name: `Equipo ${t.length + 1}`, members: [] }])}
                      >
                        <Plus size={12} /> Equipo
                      </button>
                    </div>
                    <div className="pm-teams-grid">
                      {teams.map(team => (
                        <Droppable key={team.id} droppableId={team.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`pm-team-zone${snapshot.isDraggingOver ? ' dragging-over' : ''}${team.members.length === required ? ' complete' : ''}`}
                            >
                              <div className="pm-team-header">
                                <h4>{team.name} ({team.members.length}/{required})</h4>
                                {teams.length > 1 && (
                                  <button className="pm-remove-team" onClick={() => setTeams(t => t.filter(x => x.id !== team.id))}>
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              {team.members.map((uid, i) => (
                                <Draggable key={uid} draggableId={uid} index={i}>
                                  {(p2, s2) => (
                                    <div ref={p2.innerRef} {...p2.draggableProps} {...p2.dragHandleProps} className={`pm-draggable-member${s2.isDragging ? ' dragging' : ''}`}>
                                      {usersMap.get(uid)?.username || uid}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {team.members.length < required && (
                                <div className="pm-drop-hint">Arrastra aquí ({required - team.members.length} faltan)</div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      ))}
                    </div>
                    <Droppable droppableId="remove-zone" direction="horizontal">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="pm-remove-zone">
                          <X size={16} /><span>Quitar del equipo</span>{provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </>
                )}
              </div>

              {/* Columna derecha — usuarios disponibles */}
              <div className="pm-right">
                <p className="pm-section-title">Usuarios Disponibles</p>
                <div className="pm-search">
                  <Search size={14} />
                  <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                {isTeamEvent ? (
                  <Droppable droppableId="available-users">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="pm-users-list">
                        {filteredUsers.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: 8 }}>Sin usuarios disponibles</span>}
                        {filteredUsers.map((u, i) => (
                          <Draggable key={u.id} draggableId={u.id} index={i}>
                            {(p2, s2) => (
                              <div ref={p2.innerRef} {...p2.draggableProps} {...p2.dragHandleProps} className={`pm-draggable-user${s2.isDragging ? ' dragging' : ''}`}>
                                {u.username}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ) : (
                  <div className="pm-users-list">
                    {filteredUsers.length === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: 8 }}>
                        {users.length === 0 ? 'No hay usuarios con rol APOSTADOR o superior.' : 'Sin resultados'}
                      </span>
                    )}
                    {filteredUsers.map(u => (
                      <label key={u.id} className={`pm-user-item${selectedUserIds.has(u.id) ? ' selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={e => {
                            const next = new Set(selectedUserIds);
                            e.target.checked ? next.add(u.id) : next.delete(u.id);
                            setSelectedUserIds(next);
                          }}
                        />
                        <span className="pm-user-name">{u.username}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DragDropContext>
        )}

        {/* Footer */}
        <div className="pm-footer">
          <button onClick={onClose} className="btn-cancel" style={{ padding: '8px 18px' }}>Cancelar</button>
          <button onClick={handleSave} className="btn-save" disabled={loading} style={{ padding: '8px 20px' }}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsModal;
