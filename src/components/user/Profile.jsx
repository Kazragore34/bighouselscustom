import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserById, updateUserPhoto, updateUser } from '../../services/users';
import { getBetsByUser } from '../../services/bets';
import { getVotesByUser } from '../../services/votes';
import { fileToBase64 } from '../../utils/imageUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Upload, Award, History, DollarSign, Heart, Edit2, Save, X } from 'lucide-react';
import './Profile.css';

const iconMap = {
  car: '🚗',
  boxing: '🥊',
  running: '🏃',
  search: '🔍',
  trophy: '🏆'
};

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [bets, setBets] = useState([]);
  const [votes, setVotes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '' });

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      if (!user) {
        console.error('Usuario no válido:', user);
        setLoading(false);
        return;
      }

      let userInfo;
      
      // Si tenemos ID, intentar obtener por ID
      if (user.id) {
        try {
          userInfo = await getUserById(user.id);
        } catch (error) {
          console.log('Error obteniendo por ID, intentando por email/username:', error);
          userInfo = null;
        }
      }

      // Si no funcionó por ID, buscar por email o username
      if (!userInfo) {
        try {
          const usersRef = collection(db, 'users');
          let q;
          
          if (user.email) {
            q = query(usersRef, where('email', '==', user.email));
          } else if (user.username) {
            q = query(usersRef, where('username', '==', user.username));
          } else {
            throw new Error('No hay email ni username disponible');
          }
          
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDataFromDoc = userDoc.data();
            const { password: _, ...userWithoutPassword } = userDataFromDoc;
            userInfo = {
              id: userDoc.id,
              ...userWithoutPassword
            };
          } else {
            throw new Error('Usuario no encontrado en Firestore');
          }
        } catch (error) {
          console.error('Error buscando usuario:', error);
          throw error;
        }
      }

      // Si tenemos userInfo, cargar datos adicionales
      if (userInfo && userInfo.id) {
        const [betsData, votesData] = await Promise.all([
          getBetsByUser(userInfo.id).catch(() => []),
          getVotesByUser(userInfo.id).catch(() => [])
        ]);
        
        setUserData(userInfo);
        setEditData({ name: userInfo.name || '', email: userInfo.email || '' });
        setBets(betsData);
        setVotes(votesData);
        
        // Actualizar el usuario en el contexto si el ID cambió
        if (userInfo.id !== user.id) {
          const updatedUser = { ...user, id: userInfo.id };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } else {
        throw new Error('No se pudo obtener información del usuario');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño (máximo 1MB para fotos de perfil)
    if (file.size > 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 1MB.');
      return;
    }

    try {
      setUploading(true);
      // Convertir a base64
      const base64 = await fileToBase64(file);
      
      const userId = userData?.id || user?.id;
      if (!userId) {
        alert('Error: No se pudo identificar el usuario');
        return;
      }
      await updateUserPhoto(userId, base64);
      setUserData({ ...userData, photoURL: base64 });
      alert('Foto actualizada exitosamente');
    } catch (error) {
      alert('Error al procesar la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const userId = userData?.id || user?.id;
      if (!userId) {
        alert('Error: No se pudo identificar el usuario');
        return;
      }

      await updateUser(userId, {
        name: editData.name || userData.username,
        email: editData.email || ''
      });
      setUserData({ ...userData, name: editData.name, email: editData.email });
      setEditing(false);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      alert('Error al actualizar perfil: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditData({ name: userData.name || '', email: userData.email || '' });
    setEditing(false);
  };

  if (loading) {
    return <div className="loading">Cargando perfil...</div>;
  }

  if (!userData) {
    return <div className="error">Error al cargar perfil</div>;
  }

  const totalBetAmount = bets
    .filter(bet => bet.status === 'confirmed')
    .reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-photo-section">
          <div className="profile-photo">
            {userData.photoURL ? (
              <img src={userData.photoURL} alt={userData.username} />
            ) : (
              <div className="photo-placeholder">
                {userData.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="upload-button">
            <Upload size={20} />
            {uploading ? 'Subiendo...' : 'Cambiar Foto'}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="profile-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>{userData.username}</h1>
            {!editing && (
              <button 
                onClick={() => setEditing(true)} 
                className="btn-edit-profile"
                title="Editar perfil"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>
          <p className="user-type">{userData.userType}</p>
          
          {editing ? (
            <div className="edit-profile-form">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="edit-actions">
                <button onClick={handleSaveProfile} className="btn-save-profile">
                  <Save size={16} />
                  Guardar
                </button>
                <button onClick={handleCancelEdit} className="btn-cancel-profile">
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {userData.name && userData.name !== userData.username && (
                <p className="full-name">{userData.name}</p>
              )}
              {userData.email && <p className="email">{userData.email}</p>}
            </>
          )}
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <Heart size={24} />
          <div>
            <h3>{votes.length}</h3>
            <p>Votos Realizados</p>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign size={24} />
          <div>
            <h3>${totalBetAmount.toFixed(2)}</h3>
            <p>Total Apostado</p>
          </div>
        </div>
        <div className="stat-card">
          <Award size={24} />
          <div>
            <h3>{userData.badges?.length || 0}</h3>
            <p>Insignias</p>
          </div>
        </div>
      </div>

      {userData.badges && userData.badges.length > 0 && (
        <div className="badges-section">
          <h2>
            <Award size={24} />
            Mis Insignias
          </h2>
          <div className="badges-grid">
            {userData.badges.map((badge, index) => (
              <div key={index} className="badge-card">
                <div className="badge-icon-large">
                  {iconMap[badge.icon] || '🏆'}
                </div>
                <h3>{badge.eventName}</h3>
                <p>Posición: {badge.position}</p>
                {badge.date && (
                  <p className="badge-date">{new Date(badge.date).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="history-section">
        <h2>
          <History size={24} />
          Historial de Apuestas
        </h2>
        <div className="bets-list">
          {bets.length === 0 ? (
            <p className="no-data">No has realizado apuestas aún</p>
          ) : (
            bets.map(bet => (
              <div key={bet.id} className="bet-item">
                <div className="bet-info">
                  <span className="bet-amount">${bet.amount.toFixed(2)}</span>
                  <span className={`bet-status ${bet.status}`}>
                    {bet.status === 'pending' && 'Pendiente'}
                    {bet.status === 'confirmed' && 'Confirmada'}
                    {bet.status === 'paid_out' && 'Pagada'}
                  </span>
                </div>
                <div className="bet-date">
                  {bet.createdAt?.toDate ? bet.createdAt.toDate().toLocaleDateString() : 'N/A'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
