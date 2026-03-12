import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createTeam,
  inviteToTeam,
  acceptInvitation,
  rejectInvitation,
  getTeamsByUser,
  getPendingInvitations,
  deleteTeam
} from '../../services/teams';
import { getAllUsers } from '../../services/users';
import { Users, Plus, X, Check, XCircle, Trash2, Mail } from 'lucide-react';
import './TeamManagement.css';

const TeamManagement = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, invitationsData, usersData] = await Promise.all([
        getTeamsByUser(user.id),
        getPendingInvitations(user.id),
        getAllUsers()
      ]);
      setTeams(teamsData);
      setInvitations(invitationsData);
      setUsers(usersData.filter(u => u.id !== user.id && u.enabled));
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      alert('Ingresa un nombre para el equipo');
      return;
    }

    try {
      await createTeam(teamName, user.id, selectedMembers);
      alert('Equipo creado exitosamente');
      setShowCreateModal(false);
      setTeamName('');
      setSelectedMembers([]);
      loadData();
    } catch (error) {
      alert('Error al crear equipo: ' + error.message);
    }
  };

  const handleInvite = async (teamId, toUserId) => {
    try {
      await inviteToTeam(teamId, user.id, toUserId);
      alert('Invitación enviada');
      setShowInviteModal(null);
      loadData();
    } catch (error) {
      alert('Error al enviar invitación: ' + error.message);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      await acceptInvitation(invitationId);
      alert('Invitación aceptada');
      loadData();
    } catch (error) {
      alert('Error al aceptar invitación: ' + error.message);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await rejectInvitation(invitationId);
      alert('Invitación rechazada');
      loadData();
    } catch (error) {
      alert('Error al rechazar invitación: ' + error.message);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('¿Estás seguro de eliminar este equipo?')) {
      return;
    }

    try {
      await deleteTeam(teamId);
      alert('Equipo eliminado');
      loadData();
    } catch (error) {
      alert('Error al eliminar equipo: ' + error.message);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Cargando equipos...</div>;
  }

  return (
    <div className="team-management">
      <div className="page-header">
        <h1>Mis Equipos</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-create-team"
        >
          <Plus size={20} />
          Crear Equipo
        </button>
      </div>

      {/* Invitaciones Pendientes */}
      {invitations.length > 0 && (
        <div className="invitations-section">
          <h2>Invitaciones Pendientes</h2>
          <div className="invitations-list">
            {invitations.map(invitation => {
              const fromUser = users.find(u => u.id === invitation.fromUserId);
              const team = teams.find(t => t.id === invitation.teamId);
              
              return (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-info">
                    <Mail size={20} />
                    <div>
                      <strong>{fromUser?.username || 'Usuario'}</strong> te invitó a unirte al equipo{' '}
                      <strong>{team?.name || 'Equipo'}</strong>
                    </div>
                  </div>
                  <div className="invitation-actions">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      className="btn-accept"
                    >
                      <Check size={16} />
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleRejectInvitation(invitation.id)}
                      className="btn-reject"
                    >
                      <XCircle size={16} />
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mis Equipos */}
      <div className="teams-section">
        <h2>Mis Equipos ({teams.length})</h2>
        {teams.length === 0 ? (
          <div className="no-teams">
            <Users size={48} />
            <p>No tienes equipos aún</p>
            <p>Crea un equipo para participar en eventos por equipos</p>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map(team => {
              const memberUsers = team.members
                .map(memberId => users.find(u => u.id === memberId))
                .filter(Boolean);

              return (
                <div key={team.id} className="team-card">
                  <div className="team-header">
                    <h3>{team.name}</h3>
                    {team.createdBy === user.id && (
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="btn-delete-team"
                        title="Eliminar equipo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="team-status">
                    <span className={`status-badge ${team.status}`}>
                      {team.status === 'active' ? 'Activo' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="team-members">
                    <h4>Miembros ({memberUsers.length})</h4>
                    <div className="members-list">
                      {memberUsers.map(member => (
                        <div key={member.id} className="member-item">
                          <div className="member-photo">
                            {member.photoURL ? (
                              <img src={member.photoURL} alt={member.username} />
                            ) : (
                              <div className="photo-placeholder">
                                {member.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span>{member.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {team.createdBy === user.id && team.status === 'active' && (
                    <button
                      onClick={() => setShowInviteModal(team.id)}
                      className="btn-invite"
                    >
                      <Mail size={16} />
                      Invitar Miembro
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear Equipo */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Nuevo Equipo</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre del Equipo</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej: Los Santos Racing"
                />
              </div>
              <div className="form-group">
                <label>Agregar Miembros (opcional)</label>
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <div className="users-list">
                  {filteredUsers
                    .filter(u => !selectedMembers.includes(u.id))
                    .map(user => (
                      <label key={user.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, user.id]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== user.id));
                            }
                          }}
                        />
                        {user.username}
                      </label>
                    ))}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="selected-members">
                    <strong>Seleccionados:</strong>
                    {selectedMembers.map(memberId => {
                      const member = users.find(u => u.id === memberId);
                      return (
                        <span key={memberId} className="selected-tag">
                          {member?.username}
                          <button
                            onClick={() => setSelectedMembers(selectedMembers.filter(id => id !== memberId))}
                            className="remove-tag"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleCreateTeam} className="btn-save">
                Crear Equipo
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Invitar */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invitar Miembro</h2>
              <button
                onClick={() => setShowInviteModal(null)}
                className="btn-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <div className="users-list">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <div className="member-photo">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.username} />
                          ) : (
                            <div className="photo-placeholder">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span>{user.username}</span>
                      </div>
                      <button
                        onClick={() => handleInvite(showInviteModal, user.id)}
                        className="btn-invite-user"
                      >
                        <Mail size={16} />
                        Invitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowInviteModal(null)}
                className="btn-cancel"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
