import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserById, updateUserPhoto } from '../../services/users';
import { getBetsByUser } from '../../services/bets';
import { getVotesByUser } from '../../services/votes';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { Upload, Award, History, DollarSign, Heart } from 'lucide-react';
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

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [userInfo, betsData, votesData] = await Promise.all([
        getUserById(user.id),
        getBetsByUser(user.id),
        getVotesByUser(user.id)
      ]);
      setUserData(userInfo);
      setBets(betsData);
      setVotes(votesData);
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const storageRef = ref(storage, `user-photos/${user.id}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateUserPhoto(user.id, downloadURL);
      setUserData({ ...userData, photoURL: downloadURL });
      alert('Foto actualizada exitosamente');
    } catch (error) {
      alert('Error al subir foto: ' + error.message);
    } finally {
      setUploading(false);
    }
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
          <h1>{userData.username}</h1>
          <p className="user-type">{userData.userType}</p>
          {userData.email && <p className="email">{userData.email}</p>}
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
