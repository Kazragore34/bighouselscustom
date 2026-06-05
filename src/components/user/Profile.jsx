import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserById, updateUserPhoto, updateUser } from '../../services/users';
import { getBetsByUser } from '../../services/bets';
import { getVotesByUser } from '../../services/votes';
import { fileToBase64 } from '../../utils/imageUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Upload, Award, DollarSign, Heart, Edit2, Save, X } from 'lucide-react';
import './Profile.css';

const BET_STATUS = {
  pending: { label: 'Pendiente', cls: 'pending' },
  confirmed: { label: 'Confirmada', cls: 'confirmed' },
  GANADORA: { label: 'Ganada 🎉', cls: 'won' },
  PERDIDA: { label: 'Perdida', cls: 'lost' },
  DEVUELTA: { label: 'Devuelta', cls: 'returned' },
  paid_out: { label: 'Pagada', cls: 'won' },
};

const ROLE_LABELS = {
  PENDIENTE_VERIFICACION: 'Pendiente de Verificación',
  APOSTADOR: 'Apostador',
  PARTICIPANTE: 'Participante',
  ADMIN: 'Administrador',
  VOTANTE_APOSTADOR: 'Apostador',
  SOLO_VISUALIZAR: 'Solo Visualizar',
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

  useEffect(() => { loadProfileData(); }, [user]);

  const loadProfileData = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      let userInfo = null;

      if (user.id) {
        try { userInfo = await getUserById(user.id); } catch {}
      }
      if (!userInfo && user.email) {
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        if (!snap.empty) {
          const d = snap.docs[0];
          const { password: _, ...rest } = d.data();
          userInfo = { id: d.id, ...rest };
        }
      }
      if (!userInfo && user.username) {
        const snap = await getDocs(query(collection(db, 'users'), where('username', '==', user.username)));
        if (!snap.empty) {
          const d = snap.docs[0];
          const { password: _, ...rest } = d.data();
          userInfo = { id: d.id, ...rest };
        }
      }
      if (!userInfo) throw new Error('Usuario no encontrado. Cierra sesión y vuelve a entrar.');

      const [betsData, votesData] = await Promise.all([
        getBetsByUser(userInfo.id).catch(() => []),
        getVotesByUser(userInfo.id).catch(() => []),
      ]);
      setUserData(userInfo);
      setEditData({ name: userInfo.name || '', email: userInfo.email || '' });
      setBets(betsData);
      setVotes(votesData);
    } catch (error) {
      console.error('Error cargando perfil:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert('Imagen muy grande (máx 1MB)'); return; }
    try {
      setUploading(true);
      const base64 = await fileToBase64(file);
      const uid = userData?.id || user?.id;
      await updateUserPhoto(uid, base64);
      setUserData(u => ({ ...u, photoURL: base64 }));
    } catch (error) {
      alert('Error al subir foto: ' + error.message);
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    try {
      const uid = userData?.id || user?.id;
      await updateUser(uid, { name: editData.name || userData.username, email: editData.email || '' });
      setUserData(u => ({ ...u, name: editData.name, email: editData.email }));
      setEditing(false);
    } catch (error) {
      alert('Error al actualizar: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando perfil...</div>;
  if (!userData) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Error al cargar perfil</div>;

  const totalBet = bets.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.amount, 0);
  const roleLabel = ROLE_LABELS[userData.userType || userData.role] || userData.userType || 'Usuario';

  return (
    <div className="profile-page">
      {/* Card de perfil */}
      <div className="profile-card">
        {/* Foto */}
        <div className="profile-photo-wrap">
          <div className="profile-photo">
            {userData.photoURL
              ? <img src={userData.photoURL} alt={userData.username} />
              : <div className="profile-photo-placeholder">{(userData.username || '?')[0].toUpperCase()}</div>
            }
          </div>
          <label className="profile-photo-upload" title="Cambiar foto">
            <Upload size={14} />
            {uploading ? '...' : 'Foto'}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Info */}
        <div className="profile-info">
          <div className="profile-name-row">
            <h1>{userData.username}</h1>
            {!editing && (
              <button className="btn-edit-profile" onClick={() => setEditing(true)} title="Editar">
                <Edit2 size={15} />
              </button>
            )}
          </div>
          <span className="profile-role-badge">{roleLabel}</span>

          {editing ? (
            <div className="edit-profile-form">
              <input
                type="text"
                value={editData.name}
                onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                placeholder="Nombre completo"
              />
              <input
                type="email"
                value={editData.email}
                onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
                placeholder="Email"
              />
              <div className="edit-actions">
                <button onClick={handleSave} className="btn-save-profile"><Save size={14} /> Guardar</button>
                <button onClick={() => setEditing(false)} className="btn-cancel-profile"><X size={14} /> Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              {userData.name && userData.name !== userData.username && <p className="profile-fullname">{userData.name}</p>}
              {userData.email && <p className="profile-email">{userData.email}</p>}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        {[
          { icon: <Heart size={18} />, value: votes.length, label: 'Votos' },
          { icon: <DollarSign size={18} />, value: `$${totalBet.toFixed(0)}`, label: 'Apostado' },
          { icon: <Award size={18} />, value: userData.badges?.length || 0, label: 'Insignias' },
        ].map((s, i) => (
          <div key={i} className="profile-stat-card">
            <div className="profile-stat-icon">{s.icon}</div>
            <div className="profile-stat-value">{s.value}</div>
            <div className="profile-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Insignias */}
      {userData.badges?.length > 0 && (
        <div className="profile-section">
          <h2 className="profile-section-title"><Award size={16} /> Insignias</h2>
          <div className="badges-grid">
            {userData.badges.map((badge, i) => (
              <div key={i} className="badge-card">
                <div className="badge-icon-large">{badge.icon || '🏆'}</div>
                <span>{badge.eventName || badge.name || badge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de apuestas */}
      <div className="profile-section">
        <h2 className="profile-section-title"><DollarSign size={16} /> Historial de Apuestas</h2>
        {bets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No has realizado apuestas aún</p>
        ) : (
          <div className="bets-history">
            {bets.slice().reverse().map(bet => {
              const s = BET_STATUS[bet.status] || { label: bet.status, cls: 'pending' };
              return (
                <div key={bet.id} className="bet-history-row">
                  <div className="bet-history-amount">${(bet.amount || 0).toFixed(0)}</div>
                  <div className={`bet-history-status ${s.cls}`}>{s.label}</div>
                  <div className="bet-history-date">
                    {bet.createdAt?.toDate ? bet.createdAt.toDate().toLocaleDateString('es-ES') : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
