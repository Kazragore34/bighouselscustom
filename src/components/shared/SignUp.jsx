import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { createUser } from '../../services/auth';
import { Chrome } from 'lucide-react';
import './SignUp.css';

const SignUp = () => {
  const [formData, setFormData] = useState({ username: '', name: '', password: '', confirmPassword: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginGoogle } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await createUser({
        username: formData.username,
        name: formData.name || formData.username,
        password: formData.password,
        userType: 'PENDIENTE_VERIFICACION',
        email: formData.email,
        enabled: true,
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <div className="logo-container">
            <span className="brand-icon-large">◈</span>
            <span className="brand-name-large">VANTAGE</span>
          </div>
          <p>Crear cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="error-message">{error}</div>}

          <button type="button" onClick={handleGoogle} disabled={loading} className="google-button">
            <Chrome size={18} /> Continuar con Google
          </button>

          <div className="divider"><span>O</span></div>

          <div className="form-group">
            <label>Usuario *</label>
            <input type="text" value={formData.username} onChange={e => set('username', e.target.value)} required placeholder="nombre de usuario único" minLength={3} />
          </div>

          <div className="form-group">
            <label>Nombre (opcional)</label>
            <input type="text" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="tu nombre real" />
          </div>

          <div className="form-group">
            <label>Email (opcional)</label>
            <input type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="tu@email.com" />
          </div>

          <div className="form-group">
            <label>Contraseña *</label>
            <input type="password" value={formData.password} onChange={e => set('password', e.target.value)} required placeholder="mínimo 6 caracteres" minLength={6} />
          </div>

          <div className="form-group">
            <label>Confirmar contraseña *</label>
            <input type="password" value={formData.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required placeholder="repite la contraseña" />
          </div>

          <div className="info-box">
            Tu cuenta quedará pendiente de verificación. Un admin la habilitará para votar y apostar.
          </div>

          <button type="submit" disabled={loading} className="signup-button">
            {loading ? 'Creando...' : 'Crear Cuenta'}
          </button>

          <div className="login-link">
            <p>¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
