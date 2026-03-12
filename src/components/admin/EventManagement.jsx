import { useState, useEffect } from 'react';
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventParticipants, addParticipantsToEvent } from '../../services/events';
import { getAllUsers } from '../../services/users';
import { fileToBase64 } from '../../utils/imageUtils';
import { Plus, Edit, Trash2, Upload, Users } from 'lucide-react';
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
    bannerFile: null
  });
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [uploading, setUploading] = useState(false);

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
      setUsers(usersData.filter(u => u.enabled && (u.userType === 'PARTICIPANTE' || u.userType === 'VOTANTE_APOSTADOR')));
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

  const handleEditEvent = (event) => {
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
      bannerFile: null
    });
    setShowModal(true);
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
    if (!confirm('¿Está seguro de eliminar este evento?')) {
      return;
    }

    try {
      await deleteEvent(eventId);
      loadData();
    } catch (error) {
      alert('Error al eliminar evento');
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
      bannerFile: null
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
              <div className="event-actions">
                <button onClick={() => handleEditEvent(event)} className="btn-edit">
                  <Edit size={16} />
                  Editar
                </button>
                <button onClick={() => handleDeleteEvent(event.id)} className="btn-delete">
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
    </div>
  );
};

export default EventManagement;
