import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LoginPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/perfil');
    } catch (err) {
      alert('Erro ao fazer login com Google.');
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/perfil');
    }
  }, [user, navigate]);

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', border: '1px solid #ccc', padding: 24, borderRadius: 10 }}>
      <h2>Login</h2>
      <p>Faça login para acessar o sistema.</p>
      <button onClick={handleGoogleLogin} style={{ width: '100%' }}>Entrar com Google</button>
    </div>
  );
}
