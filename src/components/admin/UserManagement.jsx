import { useState, useEffect } from 'react';
import { getAllUsers, updateUser, toggleUserEnabled, deleteUser, createUser } from '../../services/users';
import { generateRandomPassword } from '../../utils/passwordHash';
import { Edit, Trash2, Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import './admin-shared.css';
import './UserManagement.css';

const ROLES = [
  { value: 'PENDIENTE_VERIFICACION', label: 'Pendiente Verificación' },
  { value: 'APOSTADOR', label: 'Apostador' },
  { value: 'ADMIN', label: 'Admin' },
];

const getRoleDisplay = (user) => {
  const role = user.userType || user.role || 'PENDIENTE_VERIFICACION';
  const migrated = {
    'SOLO_VISUALIZAR': 'PENDIENTE_VERIFICACION',
    'NO_PARTICIPA': 'PENDIENTE_VERIFICACION',
    'VOTANTE_APOSTADOR': 'APOSTADOR',
    'PARTICIPANTE': 'APOSTADOR',
  };
  return migrated[role] || role;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    userType: 'PENDIENTE_VERIFICACION',
    email: '',
    enabled: true,
  });

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    if (!searchTerm) { setFilteredUsers(users); return; }
    const term = searchTerm.toLowerCase();
    setFilteredUsers(users.filter(u =>
      u.username?.toLowerCase().includes(term) ||
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    ));
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (user) => {
    try {
      await updateUser(user.id, { userType: 'APOSTADOR' });
      loadUsers();
    } catch (error) {
      alert('Error al verificar usuario: ' + error.message);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!formData.password && !formData.username) {
        alert('Usuario y contraseña son obligatorios');
        return;
      }
      const pwd = formData.password || generateRandomPassword();
      await createUser({
        username: formData.username,
        name: formData.name || formData.username,
        password: pwd,
        userType: formData.userType,
        email: formData.email,
        enabled: formData.enabled,
      });
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      alert(error.message || 'Error al crear usuario');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name || '',
      password: '',
      userType: getRoleDisplay(user),
      email: user.email || '',
      enabled: user.enabled !== false,
    });
    setShowModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const updates = {
        userType: formData.userType,
        name: formData.name || formData.username,
        email: formData.email,
        enabled: formData.enabled,
      };
      if (formData.password) updates.password = formData.password;
      await updateUser(editingUser.id, updates);
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      alert(error.message || 'Error al actualizar usuario');
    }
  };

  const handleToggleEnabled = async (userId, current) => {
    try {
      await toggleUserEnabled(userId, !current);
      loadUsers();
    } catch (error) {
      alert('Error al cambiar estado');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await deleteUser(userId);
      loadUsers();
    } catch (error) {
      alert('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({ username: '', name: '', password: '', userType: 'PENDIENTE_VERIFICACION', email: '', enabled: true });
    setEditingUser(null);
  };

  if (loading) return <div className="loading" style={{ color: 'var(--text-muted)', padding: 48, textAlign: 'center' }}>Cargando usuarios...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Gestión de <span>Usuarios</span></h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-add">
          <Plus size={16} />
          Crear Usuario
        </button>
      </div>

      <div className="search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar por usuario, nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const role = getRoleDisplay(user);
              const isPending = role === 'PENDIENTE_VERIFICACION';
              return (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border-gold)', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border-gold)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gold-primary)', fontWeight: 700 }}>
                          {(user.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user.username}</div>
                        {user.name && user.name !== user.username && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{user.email || '—'}</td>
                  <td>
                    <span className={`role-badge role-${role}`}>{role.replace(/_/g, ' ')}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleEnabled(user.id, user.enabled !== false)}
                      className={`enabled-badge ${user.enabled !== false ? 'enabled-yes' : 'enabled-no'}`}
                      style={{ cursor: 'pointer', border: 'none', padding: '3px 10px' }}
                      title={user.enabled !== false ? 'Clic para deshabilitar' : 'Clic para habilitar'}
                    >
                      {user.enabled !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions">
                      {isPending && (
                        <button
                          onClick={() => handleVerify(user)}
                          className="btn-table-action btn-table-success"
                          title="Verificar → Apostador"
                        >
                          <CheckCircle size={13} />
                          Verificar
                        </button>
                      )}
                      <button
                        onClick={() => handleEditUser(user)}
                        className="btn-table-action btn-table-edit"
                        title="Editar"
                      >
                        <Edit size={13} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn-table-action btn-table-danger"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No se encontraron usuarios
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</h2>

            <div className="form-group">
              <label>Usuario *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="nombre de usuario único"
              />
            </div>

            <div className="form-group">
              <label>Nombre Real</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo (puede diferir del usuario)"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label>Rol Global</label>
              <select
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{editingUser ? 'Nueva contraseña (vacío = sin cambio)' : 'Contraseña *'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'contraseña'}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                  style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', borderRadius: 7, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Generar
                </button>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexDirection: 'row' }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  style={{ width: 'auto', padding: 0 }}
                />
                <span>Usuario habilitado</span>
              </label>
            </div>

            <div className="admin-modal-footer">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-cancel">Cancelar</button>
              <button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="btn-save">
                {editingUser ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
