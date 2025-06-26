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
    <div style={{
      maxWidth: '450px', 
      margin: '60px auto', 
      border: '1px solid #ccc', 
      padding: '30px', 
      borderRadius: '10px', 
      textAlign: 'center',
      backgroundColor: '#f9f9f9'
    }}>
      <h2 style={{ fontSize: '2em', color: '#333', marginBottom: '15px' }}>Login</h2>
      <p style={{ fontSize: '1.15em', color: '#555', marginBottom: '30px', lineHeight: '1.6' }}>
        Access the platform to find or offer services.
      </p>
      <button 
        onClick={handleGoogleLogin} 
        style={{
          width: '100%', 
          padding: '15px', 
          fontSize: '1.2em', 
          backgroundColor: '#db4437', // Google's red
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
