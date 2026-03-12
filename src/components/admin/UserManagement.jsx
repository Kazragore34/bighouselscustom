import { useState, useEffect } from 'react';
import { getAllUsers, updateUser, toggleUserEnabled, deleteUser, createUser } from '../../services/users';
import { generateRandomPassword } from '../../utils/passwordHash';
import { Edit, Trash2, Check, X, Plus, Search } from 'lucide-react';
import './UserManagement.css';

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
    userType: 'SOLO_VISUALIZAR',
    email: '',
    enabled: true,
    autoGeneratePassword: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    try {
      let password = formData.password;
      
      if (formData.autoGeneratePassword) {
        password = generateRandomPassword();
      }

      if (!password) {
        alert('Debe ingresar una contraseña o generar una automáticamente');
        return;
      }

      await createUser({
        username: formData.username,
        name: formData.name || formData.username,
        password,
        userType: formData.userType,
        email: formData.email,
        enabled: formData.enabled
      });

      alert('Usuario creado exitosamente');
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
      userType: user.userType || 'SOLO_VISUALIZAR',
      email: user.email || '',
      enabled: user.enabled,
      autoGeneratePassword: false
    });
    setShowModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const updates = {
        userType: formData.userType,
        name: formData.name || formData.username,
        email: formData.email,
        enabled: formData.enabled
      };

      if (formData.password) {
        updates.password = formData.password;
      }

      await updateUser(editingUser.id, updates);
      alert('Usuario actualizado exitosamente');
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      alert(error.message || 'Error al actualizar usuario');
    }
  };

  const handleToggleEnabled = async (userId, currentStatus) => {
    try {
      await toggleUserEnabled(userId, !currentStatus);
      loadUsers();
    } catch (error) {
      alert('Error al cambiar estado del usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) {
      return;
    }

    try {
      await deleteUser(userId);
      loadUsers();
    } catch (error) {
      alert('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      userType: 'VOTANTE_APOSTADOR',
      email: '',
      enabled: true,
      autoGeneratePassword: false
    });
    setEditingUser(null);
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData({ ...formData, password: newPassword, autoGeneratePassword: false });
  };

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>;
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-add">
          <Plus size={20} />
          Crear Usuario
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar por usuario o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div>
                    <strong>{user.username}</strong>
                    {user.name && user.name !== user.username && (
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{user.name}</div>
                    )}
                  </div>
                </td>
                <td>{user.email || '-'}</td>
                <td>
                  <span className={`badge badge-${user.userType.toLowerCase()}`}>
                    {user.userType}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleEnabled(user.id, user.enabled)}
                    className={`toggle-btn ${user.enabled ? 'enabled' : 'disabled'}`}
                  >
                    {user.enabled ? <Check size={16} /> : <X size={16} />}
                    {user.enabled ? 'Habilitado' : 'Deshabilitado'}
                  </button>
                </td>
                <td>
                  <div className="actions">
                    <button onClick={() => handleEditUser(user)} className="btn-edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} className="btn-delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</h2>
            
            <div className="form-group">
              <label>Usuario</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                required
                placeholder="Nombre de usuario único"
              />
            </div>

            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre de la persona (puede ser diferente al usuario)"
              />
            </div>

            <div className="form-group">
              <label>Email (opcional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Tipo de Usuario</label>
              <select
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              >
                <option value="SOLO_VISUALIZAR">Solo Visualizar</option>
                <option value="NO_PARTICIPA">No Participa</option>
                <option value="PARTICIPANTE">Participante</option>
                <option value="VOTANTE_APOSTADOR">Votante/Apostador</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {!editingUser && (
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.autoGeneratePassword}
                    onChange={(e) => setFormData({ ...formData, autoGeneratePassword: e.target.checked, password: '' })}
                  />
                  Generar contraseña automáticamente
                </label>
              </div>
            )}

            {(!formData.autoGeneratePassword || editingUser) && (
              <div className="form-group">
                <label>
                  {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </label>
                <div className="password-input-group">
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                  {!editingUser && (
                    <button type="button" onClick={handleGeneratePassword} className="btn-generate">
                      Generar
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                Usuario habilitado
              </label>
            </div>

            <div className="modal-actions">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-cancel">
                Cancelar
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                className="btn-save"
              >
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
