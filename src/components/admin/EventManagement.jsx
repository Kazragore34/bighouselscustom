import { useState, useEffect } from 'react';
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventParticipants, addParticipantsToEvent, closeParticipantsList, getEventById } from '../../services/events';
import { generateSmartBrackets } from '../../services/brackets';
import { getAllUsers, getUserById } from '../../services/users';
import { fileToBase64 } from '../../utils/imageUtils';
import { Plus, Edit, Trash2, Upload, Users, UserPlus, X, Trophy } from 'lucide-react';
import ParticipantsModal from './ParticipantsModal';
import './EventManagement.css';

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'race',
    bracketType: '1v1',
    participantsPerBracket: 2,
    houseCommission: 10,
    icon: 'trophy',
    status: 'draft',
    bannerURL: '',
    bannerFile: null,
    betDeadline: '', // Fecha/hora límite para apostar/votar
    startDate: '',
    endDate: '',
    maxBetPerUser: 0 // 0 = sin límite, >0 = límite máximo por usuario
  });
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [currentEventForParticipants, setCurrentEventForParticipants] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, usersData] = await Promise.all([
        getAllEvents(),
        getAllUsers()
      ]);
      setEvents(eventsData);
      // Mostrar solo usuarios PARTICIPANTE para agregar como participantes del evento
      // VOTANTE_APOSTADOR puede votar/apostar pero NO aparece en la lista de participantes
      setUsers(usersData.filter(u => u.enabled && u.userType === 'PARTICIPANTE'));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 2MB.');
        return;
      }
      
      try {
        setUploading(true);
        // Convertir a base64
        const base64 = await fileToBase64(file);
        setFormData({ ...formData, bannerURL: base64, bannerFile: file });
      } catch (error) {
        alert('Error al procesar la imagen');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUrlChange = (e) => {
    setFormData({ ...formData, bannerURL: e.target.value, bannerFile: null });
  };

  const handleCreateEvent = async () => {
    try {
      if (!formData.bannerURL) {
        if (!confirm('¿Crear evento sin banner?')) {
          return;
        }
      }

      // Eliminar bannerFile del objeto antes de enviar (Firestore no acepta undefined ni null)
      const { bannerFile, ...eventData } = formData;
      // Asegurarse de que bannerFile no esté en el objeto
      delete eventData.bannerFile;
      const eventId = await createEvent(eventData);

      // Agregar participantes si se seleccionaron
      if (selectedParticipants.length > 0) {
        await addParticipantsToEvent(eventId, selectedParticipants);
      }

      alert('Evento creado exitosamente');
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
      name: event.name,
      description: event.description || '',
      eventType: event.eventType || 'race',
      bracketType: event.bracketType || '1v1',
      participantsPerBracket: event.participantsPerBracket || 2,
      houseCommission: event.houseCommission || 10,
      icon: event.icon || 'trophy',
      status: event.status || 'draft',
      bannerURL: event.bannerURL || '',
      bannerFile: null,
      betDeadline: event.betDeadline || '',
      startDate: event.startDate || '',
      endDate: event.endDate || '',
      maxBetPerUser: event.maxBetPerUser || 0
    });
    
    // Cargar participantes del evento
    try {
      const participants = await getEventParticipants(event.id);
      const participantsWithData = await Promise.all(
        participants.map(async (p) => {
          const userData = await getUserById(p.userId);
          return { ...p, ...userData };
        })
      );
      setEventParticipants(participantsWithData);
    } catch (error) {
      console.error('Error cargando participantes:', error);
      setEventParticipants([]);
    }
    
    setShowModal(true);
  };

  const handleSetWinner = async (event) => {
    try {
      const eventData = await getEventById(event.id);
      const participants = await getEventParticipants(event.id);
      const participantsWithData = await Promise.all(
        participants.map(async (p) => {
          try {
            const userData = await getUserById(p.userId);
            return { ...p, ...userData };
          } catch (err) {
            return { ...p, username: 'Usuario no encontrado' };
          }
        })
      );

      const isTeamEvent = event.bracketType === '2v2' || event.bracketType === 'custom';
      
      if (isTeamEvent) {
        // Para eventos por equipos, mostrar equipos
        const teams = {};
        participantsWithData.forEach(p => {
          if (p.teamId) {
            if (!teams[p.teamId]) {
              teams[p.teamId] = [];
            }
            teams[p.teamId].push(p);
          }
        });

        const teamOptions = Object.entries(teams).map(([teamId, members]) => ({
          id: teamId,
          name: `Equipo ${teamId}`,
          members: members.map(m => m.username).join(', ')
        }));

        const selectedTeam = prompt(
          `Equipos disponibles:\n${teamOptions.map((t, i) => `${i + 1}. ${t.name} (${t.members})`).join('\n')}\n\nIngresa el número del equipo ganador:`
        );

        if (selectedTeam) {
          const teamIndex = parseInt(selectedTeam) - 1;
          if (teamIndex >= 0 && teamIndex < teamOptions.length) {
            await setEventWinner(event.id, null, teamOptions[teamIndex].id);
            alert('Ganador establecido exitosamente');
            loadData();
          }
        }
      } else {
        // Para eventos individuales
        const participantOptions = participantsWithData.map((p, i) => ({
          id: p.userId,
          name: p.username || 'Usuario desconocido',
          index: i + 1
        }));

        const selected = prompt(
          `Participantes disponibles:\n${participantOptions.map(p => `${p.index}. ${p.name}`).join('\n')}\n\nIngresa el número del ganador:`
        );

        if (selected) {
          const participantIndex = parseInt(selected) - 1;
          if (participantIndex >= 0 && participantIndex < participantOptions.length) {
            await setEventWinner(event.id, participantOptions[participantIndex].id, null);
            alert('Ganador establecido exitosamente');
            loadData();
          }
        }
      }
    } catch (error) {
      alert('Error al establecer ganador: ' + error.message);
    }
  };

  const handleUpdateEvent = async () => {
    try {
      // Eliminar bannerFile del objeto antes de enviar (Firestore no acepta undefined ni null)
      const { bannerFile, ...eventData } = formData;
      // Asegurarse de que bannerFile no esté en el objeto
      delete eventData.bannerFile;
      await updateEvent(editingEvent.id, eventData);

      alert('Evento actualizado exitosamente');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      alert(error.message || 'Error al actualizar evento');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Está seguro de eliminar este evento? Esto eliminará también todos los participantes, votos, apuestas y brackets asociados.')) {
      return;
    }

    try {
      await deleteEvent(eventId);
      alert('Evento eliminado exitosamente');
      loadData();
    } catch (error) {
      console.error('Error completo al eliminar evento:', error);
      alert('Error al eliminar evento: ' + (error.message || 'Error desconocido. Verifica la consola para más detalles.'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      eventType: 'race',
      bracketType: '1v1',
      participantsPerBracket: 2,
      houseCommission: 10,
      icon: 'trophy',
      status: 'draft',
      bannerURL: '',
      bannerFile: null,
      betDeadline: '',
      startDate: '',
      endDate: '',
      maxBetPerUser: 0
    });
    setSelectedParticipants([]);
    setEditingEvent(null);
  };

  if (loading) {
    return <div className="loading">Cargando eventos...</div>;
  }

  return (
    <div className="event-management">
      <div className="page-header">
        <h1>Gestión de Eventos</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-add">
          <Plus size={20} />
          Crear Evento
        </button>
      </div>

      <div className="events-list">
        {events.map(event => (
          <div key={event.id} className="event-card">
            {event.bannerURL && (
              <div className="event-banner" style={{ backgroundImage: `url(${event.bannerURL})` }} />
            )}
            <div className="event-content">
              <h3>{event.name}</h3>
              <p>{event.description || 'Sin descripción'}</p>
              <div className="event-meta">
                <span className="badge badge-type">{event.eventType}</span>
                <span className="badge badge-status">{event.status}</span>
                <span className="badge badge-commission">Comisión: {event.houseCommission}%</span>
              </div>
              <div className="event-actions" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleEditEvent(event);
                  }} 
                  className="btn-edit"
                >
                  <Edit size={16} />
                  Editar
                </button>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    try {
                      console.log('Cargando participantes para evento:', event.id);
                      const participants = await getEventParticipants(event.id);
                      console.log('Participantes encontrados:', participants);
                      const participantsWithData = await Promise.all(
                        participants.map(async (p) => {
                          try {
                            const userData = await getUserById(p.userId);
                            return { ...p, ...userData };
                          } catch (err) {
                            console.error('Error cargando usuario:', p.userId, err);
                            return { ...p, username: 'Usuario no encontrado', name: 'Usuario no encontrado' };
                          }
                        })
                      );
                      console.log('Participantes con datos:', participantsWithData);
                      setEventParticipants(participantsWithData);
                      setCurrentEventForParticipants(event);
                      setShowParticipantsModal(true);
                      console.log('Modal de participantes abierto');
                    } catch (error) {
                      console.error('Error completo:', error);
                      alert('Error cargando participantes: ' + error.message);
                    }
                  }}
                  className="btn-participants"
                  title="Gestionar participantes"
                >
                  <Users size={16} />
                  Participantes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.location.href = `/admin/events/${event.id}/brackets`;
                  }}
                  className="btn-brackets"
                  title="Editar brackets"
                >
                  <Trophy size={16} />
                  Brackets
                </button>
                {(event.status === 'active' || event.status === 'completed') && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      await handleSetWinner(event);
                    }}
                    className="btn-winner"
                    title="Establecer ganador final"
                  >
                  <Trophy size={16} />
                  Ganador
                </button>
                {!event.participantsListClosed && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!confirm('¿Cerrar lista de participantes y generar bracket final? Esto creará el bracket oficial basado en votos y apuestas actuales. Ya no se podrán agregar más participantes.')) {
                        return;
                      }
                      try {
                        // Cerrar lista
                        await closeParticipantsList(event.id);
                        
                        // Obtener participantes y generar bracket final
                        const participants = await getEventParticipants(event.id);
                        const participantsWithData = await Promise.all(
                          participants.map(async (p) => {
                            try {
                              const userData = await getUserById(p.userId);
                              return { ...p, ...userData };
                            } catch (err) {
                              return { ...p, username: p.userId };
                            }
                          })
                        );
                        
                        const bracketType = event.bracketType || '1v1';
                        const participantsPerBracket = event.participantsPerBracket || 2;
                        
                        await generateSmartBrackets(event.id, participantsWithData, bracketType, participantsPerBracket);
                        alert('Lista cerrada y bracket final generado exitosamente');
                        loadData();
                      } catch (error) {
                        console.error('Error cerrando lista:', error);
                        alert('Error: ' + error.message);
                      }
                    }}
                    className="btn-close-list"
                    title="Cerrar lista de participantes y generar bracket final"
                  >
                    <X size={16} />
                    Cerrar Lista
                  </button>
                )}
                {event.participantsListClosed && (
                  <span className="badge badge-closed" title="Lista de participantes cerrada">
                    Lista Cerrada
                  </span>
                )}
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteEvent(event.id);
                  }} 
                  className="btn-delete"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEvent ? 'Editar Evento' : 'Crear Evento'}</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Evento</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Evento</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                >
                  <option value="race">Carrera</option>
                  <option value="fight">Pelea</option>
                  <option value="competition">Competencia</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Bracket</label>
                <select
                  value={formData.bracketType}
                  onChange={(e) => setFormData({ ...formData, bracketType: e.target.value })}
                >
                  <option value="1v1">1 vs 1</option>
                  <option value="2v2">2 vs 2</option>
                  <option value="10x10">10x10</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Participantes por Bracket</label>
                <input
                  type="number"
                  value={formData.participantsPerBracket}
                  onChange={(e) => setFormData({ ...formData, participantsPerBracket: parseInt(e.target.value) })}
                  min="2"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Icono</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                >
                  <option value="car">Carro</option>
                  <option value="boxing">Box</option>
                  <option value="running">Corriendo</option>
                  <option value="search">Búsqueda</option>
                  <option value="trophy">Trofeo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Comisión de la Casa (%)</label>
                <input
                  type="number"
                  value={formData.houseCommission}
                  onChange={(e) => setFormData({ ...formData, houseCommission: parseFloat(e.target.value) })}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fecha/Hora Límite para Apostar/Votar</label>
              <input
                type="datetime-local"
                value={formData.betDeadline || ''}
                onChange={(e) => setFormData({ ...formData, betDeadline: e.target.value })}
                placeholder="Fecha límite para apostar/votar"
              />
              <p className="help-text">⚠️ Después de esta fecha no se podrán realizar apuestas ni votos</p>
            </div>

            <div className="form-group">
              <label>Límite Máximo de Apuesta por Usuario (Anti-Manipulación)</label>
              <input
                type="number"
                value={formData.maxBetPerUser || ''}
                onChange={(e) => setFormData({ ...formData, maxBetPerUser: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                placeholder="0 = Sin límite"
              />
              <p className="help-text">💡 Establece un límite máximo que cada usuario puede apostar en total en este evento. 0 = sin límite. Esto ayuda a prevenir manipulación.</p>
            </div>

            <div className="form-group">
              <label>Banner del Evento (URL o subir imagen)</label>
              <div className="banner-input-group">
                <input
                  type="text"
                  value={formData.bannerURL}
                  onChange={handleUrlChange}
                  placeholder="Pega la URL de la imagen aquí"
                  className="banner-url-input"
                />
                <span className="or-divider">O</span>
                <div className="file-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {formData.bannerFile && (
                    <span className="file-name">✓ {formData.bannerFile.name}</span>
                  )}
                </div>
              </div>
              {formData.bannerURL && (
                <div className="banner-preview">
                  <img src={formData.bannerURL} alt="Preview" />
                </div>
              )}
              <p className="help-text">
                💡 Puedes usar una URL de imagen o subir una imagen (se convertirá a base64, máximo 2MB)
              </p>
            </div>

            {!editingEvent && (
              <div className="form-group">
                <label>Participantes (opcional - se pueden agregar después)</label>
                <div className="participants-selector">
                  {users.map(user => (
                    <label key={user.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, user.id]);
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== user.id));
                          }
                        }}
                      />
                      {user.username}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {editingEvent && (
              <div className="form-group">
                <label>Participantes del Evento</label>
                <div className="current-participants">
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
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentEventForParticipants(editingEvent);
                      setShowParticipantsModal(true);
                    }}
                    className="btn-add-participants"
                  >
                    <UserPlus size={16} />
                    {eventParticipants.length === 0 ? 'Agregar Participantes' : 'Gestionar Participantes'}
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-cancel">
                Cancelar
              </button>
              <button
                onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                className="btn-save"
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : editingEvent ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para gestionar participantes */}
      <ParticipantsModal
        event={currentEventForParticipants}
        isOpen={showParticipantsModal}
        onClose={() => {
          setShowParticipantsModal(false);
          setCurrentEventForParticipants(null);
          setSelectedParticipants([]);
        }}
        onUpdate={() => {
          loadData();
        }}
      />
    </div>
  );
};

export default EventManagement;
