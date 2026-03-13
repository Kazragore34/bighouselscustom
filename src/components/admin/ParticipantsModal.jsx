import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getAvailableTeamsForEvent } from '../../services/teams';
import { addParticipantsToEvent, addTeamToEvent, getEventParticipants } from '../../services/events';
import { getAllUsers, getUserById } from '../../services/users';
import { Search, Users, X, Plus, Trash2 } from 'lucide-react';
import './ParticipantsModal.css';

const ParticipantsModal = ({ event, isOpen, onClose, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [teams, setTeams] = useState([]); // Equipos creados en este modal
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      loadData();
    }
  }, [isOpen, event]);

  const loadData = async () => {
    try {
      setLoading(true);
      const isTeamEvent = event.bracketType === '2v2' || event.bracketType === 'custom';
      const requiredMembers = event.participantsPerBracket || 2;

      // Cargar datos en paralelo
      const [usersData, participantsData] = await Promise.all([
        getAllUsers(),
        getEventParticipants(event.id)
      ]);

      // Filtrar solo usuarios PARTICIPANTE y crear mapa para acceso rápido
      const participantUsers = usersData.filter(u => u.enabled && u.userType === 'PARTICIPANTE');
      const usersMap = new Map(participantUsers.map(u => [u.id, u]));
      setUsers(participantUsers);

      // Optimizar: usar el mapa en lugar de hacer llamadas individuales a Firestore
      const participantsWithData = participantsData.map((p) => {
        const userData = usersMap.get(p.userId);
        return userData 
          ? { ...p, ...userData }
          : { ...p, username: 'Usuario no encontrado' };
      });
      setEventParticipants(participantsWithData);

      // Si es evento por equipos
      if (isTeamEvent) {
        // Cargar equipos disponibles en paralelo
        const [teamsData, existingTeams] = await Promise.all([
          getAvailableTeamsForEvent(requiredMembers),
          Promise.resolve(groupParticipantsIntoTeams(participantsWithData, requiredMembers))
        ]);
        
        setAvailableTeams(teamsData);
        setTeams(existingTeams.length > 0 ? existingTeams : [{ id: 'team-1', name: 'Equipo 1', members: [] }]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar participantes existentes en equipos
  const groupParticipantsIntoTeams = (participants, membersPerTeam) => {
    const teams = [];
    const usedParticipantIds = new Set();

    for (let i = 0; i < participants.length; i += membersPerTeam) {
      const teamMembers = participants.slice(i, i + membersPerTeam);
      if (teamMembers.length === membersPerTeam) {
        teams.push({
          id: `team-${teams.length + 1}`,
          name: `Equipo ${teams.length + 1}`,
          members: teamMembers.map(p => p.userId)
        });
        teamMembers.forEach(p => usedParticipantIds.add(p.userId));
      }
    }

    return teams;
  };

  // Memoizar cálculos pesados para evitar recalcular en cada render
  const assignedUserIds = useMemo(() => {
    const assigned = new Set();
    teams.forEach(team => {
      team.members.forEach(userId => assigned.add(userId));
    });
    eventParticipants.forEach(p => assigned.add(p.userId));
    return assigned;
  }, [teams, eventParticipants]);

  const filteredUsers = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return users.filter(u =>
      !assignedUserIds.has(u.id) &&
      (u.username?.toLowerCase().includes(searchLower) ||
       u.name?.toLowerCase().includes(searchLower))
    );
  }, [users, assignedUserIds, searchTerm]);

  // Memoizar mapa de usuarios para acceso rápido
  const usersMap = useMemo(() => {
    return new Map(users.map(u => [u.id, u]));
  }, [users]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Si es evento por equipos
    if (event.bracketType === '2v2' || event.bracketType === 'custom') {
      const requiredMembers = event.participantsPerBracket || 2;

      // Si viene de la lista de usuarios disponibles
      if (source.droppableId === 'available-users') {
        const userId = draggableId;
        const targetTeamId = destination.droppableId;

        // Agregar usuario al equipo
        setTeams(prevTeams => {
          const newTeams = [...prevTeams];
          const teamIndex = newTeams.findIndex(t => t.id === targetTeamId);
          
          if (teamIndex !== -1) {
            const team = { ...newTeams[teamIndex] };
            if (!team.members.includes(userId) && team.members.length < requiredMembers) {
              team.members = [...team.members, userId];
              newTeams[teamIndex] = team;
            }
          }
          
          return newTeams;
        });
      }
      // Si se mueve entre equipos
      else if (source.droppableId.startsWith('team-') && destination.droppableId.startsWith('team-')) {
        const userId = draggableId;
        const sourceTeamId = source.droppableId;
        const destTeamId = destination.droppableId;

        setTeams(prevTeams => {
          const newTeams = [...prevTeams];
          const sourceTeamIndex = newTeams.findIndex(t => t.id === sourceTeamId);
          const destTeamIndex = newTeams.findIndex(t => t.id === destTeamId);

          if (sourceTeamIndex !== -1 && destTeamIndex !== -1) {
            const sourceTeam = { ...newTeams[sourceTeamIndex] };
            const destTeam = { ...newTeams[destTeamIndex] };

            if (destTeam.members.length < requiredMembers) {
              sourceTeam.members = sourceTeam.members.filter(id => id !== userId);
              destTeam.members = [...destTeam.members, userId];
              
              newTeams[sourceTeamIndex] = sourceTeam;
              newTeams[destTeamIndex] = destTeam;
            }
          }

          return newTeams;
        });
      }
      // Si se elimina de un equipo (arrastrar fuera)
      else if (source.droppableId.startsWith('team-') && destination.droppableId === 'remove-zone') {
        const userId = draggableId;
        const sourceTeamId = source.droppableId;

        setTeams(prevTeams => {
          const newTeams = [...prevTeams];
          const teamIndex = newTeams.findIndex(t => t.id === sourceTeamId);
          
          if (teamIndex !== -1) {
            const team = { ...newTeams[teamIndex] };
            team.members = team.members.filter(id => id !== userId);
            newTeams[teamIndex] = team;
          }
          
          return newTeams;
        });
      }
    }
  };

  const handleAddTeam = () => {
    const newTeamId = `team-${teams.length + 1}`;
    setTeams([...teams, { id: newTeamId, name: `Equipo ${teams.length + 1}`, members: [] }]);
  };

  const handleRemoveTeam = (teamId) => {
    setTeams(teams.filter(t => t.id !== teamId));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (event.bracketType === '2v2' || event.bracketType === 'custom') {
        // Guardar equipos
        const participantsToAdd = [];
        
        for (const team of teams) {
          if (team.members.length === (event.participantsPerBracket || 2)) {
            // Agregar cada miembro del equipo
            team.members.forEach(userId => {
              participantsToAdd.push({ userId, teamId: team.id });
            });
          }
        }

        if (participantsToAdd.length > 0) {
          await addParticipantsToEvent(event.id, participantsToAdd);
        }
      } else {
        // Evento individual - agregar participantes seleccionados manualmente
        // Esto se manejará con checkboxes tradicionales
      }

      alert('Participantes guardados exitosamente');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailableTeam = async (teamId) => {
    try {
      await addTeamToEvent(event.id, teamId);
      alert('Equipo agregado exitosamente');
      loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Error al agregar equipo: ' + error.message);
    }
  };

  if (!isOpen) return null;

  const isTeamEvent = event.bracketType === '2v2' || event.bracketType === 'custom';
  const requiredMembers = event.participantsPerBracket || 2;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content participants-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gestionar Participantes - {event.name}</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="participants-modal-content">
              {/* Equipos Disponibles (solo para eventos por equipos) */}
              {isTeamEvent && availableTeams.length > 0 && (
                <div className="available-teams-section">
                  <h3>Equipos Disponibles</h3>
                  <div className="teams-grid">
                    {availableTeams.map(team => (
                      <div key={team.id} className="available-team-card">
                        <h4>{team.name}</h4>
                        <div className="team-members-preview">
                          {team.members.slice(0, 3).map(memberId => {
                            const member = usersMap.get(memberId);
                            return (
                              <span key={memberId} className="member-tag">
                                {member?.username || memberId}
                              </span>
                            );
                          })}
                          {team.members.length > 3 && <span>+{team.members.length - 3}</span>}
                        </div>
                        <button
                          onClick={() => handleAddAvailableTeam(team.id)}
                          className="btn-add-team"
                        >
                          Agregar Equipo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista por Equipos */}
              {isTeamEvent ? (
                <div className="teams-view">
                  <div className="teams-header">
                    <h3>Equipos del Evento</h3>
                    <button onClick={handleAddTeam} className="btn-add-team-small">
                      <Plus size={16} />
                      Agregar Equipo
                    </button>
                  </div>
                  
                  <div className="teams-container-scroll">
                    <div className="teams-container">
                    {teams.map((team, teamIndex) => (
                      <Droppable key={team.id} droppableId={team.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`team-drop-zone ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${
                              team.members.length === requiredMembers ? 'complete' : 'incomplete'
                            }`}
                          >
                            <div className="team-header">
                              <h4>{team.name}</h4>
                              {teams.length > 1 && (
                                <button
                                  onClick={() => handleRemoveTeam(team.id)}
                                  className="btn-remove-team"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="team-members-drop">
                              {team.members.map((userId, index) => {
                                const user = usersMap.get(userId);
                                return (
                                  <Draggable key={userId} draggableId={userId} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`draggable-member ${snapshot.isDragging ? 'dragging' : ''}`}
                                      >
                                        {user?.username || userId}
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                              {team.members.length < requiredMembers && (
                                <div className="drop-hint">
                                  Arrastra aquí ({requiredMembers - team.members.length} faltan)
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    ))}
                    </div>
                  </div>

                  {/* Zona de eliminación */}
                  <Droppable droppableId="remove-zone" direction="horizontal">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="remove-zone"
                      >
                        <X size={24} />
                        <span>Eliminar</span>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ) : (
                /* Vista Individual */
                <div className="individual-view">
                  <h3>Participantes Actuales ({eventParticipants.length})</h3>
                  {eventParticipants.length === 0 ? (
                    <p className="no-participants">No hay participantes agregados aún</p>
                  ) : (
                    <div className="participants-list">
                      {eventParticipants.map(p => (
                        <div key={p.id} className="participant-badge">
                          <span>{p.username || p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lista de Usuarios Disponibles */}
              <div className="available-users-section">
                <h3>Usuarios Disponibles</h3>
                <div className="search-box">
                  <Search size={20} />
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {isTeamEvent ? (
                  <Droppable droppableId="available-users" direction="vertical">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="users-list-droppable"
                      >
                        {filteredUsers.map((user, index) => (
                          <Draggable key={user.id} draggableId={user.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`draggable-user ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                {user.username}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ) : (
                  <div className="users-list-checkbox">
                    {filteredUsers.map(user => (
                      <label key={user.id} className="checkbox-label">
                        <input type="checkbox" />
                        {user.username}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DragDropContext>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancel">
            Cerrar
          </button>
          <button onClick={handleSave} className="btn-save" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsModal;
