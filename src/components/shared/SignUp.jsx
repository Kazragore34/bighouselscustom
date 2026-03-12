import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { createUser, loginWithGoogle } from '../../services/auth';
import { Chrome } from 'lucide-react';
import './SignUp.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Crear usuario con tipo por defecto: SOLO_VISUALIZAR
      await createUser({
        username: formData.username,
        name: formData.name || formData.username, // Nombre de la persona
        password: formData.password,
        userType: 'SOLO_VISUALIZAR',
        email: formData.email,
        enabled: true // Habilitado para login, pero con permisos limitados
      });

      alert('Cuenta creada exitosamente. Un administrador debe habilitar tus permisos para votar/apostar.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await loginGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <div className="logo-container">
            <div className="gta-logo">⭐</div>
            <h1>Los Santos Custom</h1>
          </div>
          <p>Crear Cuenta</p>
        </div>
        
        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="Elige un nombre de usuario"
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Nombre Completo</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tu nombre completo (opcional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (opcional)</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              placeholder="Repite tu contraseña"
              minLength={6}
            />
          </div>

          <div className="info-box">
            <p>⚠️ Por defecto, solo podrás visualizar eventos. Un administrador debe habilitar tus permisos para votar y apostar.</p>
          </div>

          <button type="submit" disabled={loading} className="signup-button">
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>

          <div className="divider">
            <span>O</span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleSignUp} 
            disabled={loading}
            className="google-button"
          >
            <Chrome size={20} />
            Continuar con Google
          </button>

          <div className="login-link">
            <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
