import { useEffect, useState } from 'react';
import { auth, provider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import './App.css';
import ServiceForm from './ServiceForm';
import ServiceList from './ServiceList';
import ProfileConfig from './ProfileConfig';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import PhoneRegisterPage from './PhoneRegisterPage';
import LoginPage from './LoginPage';
import AdminUsersPage from './AdminUsersPage';
import ProfileDetails from './ProfileDetails';
import AdBanner from './AdBanner'; // Importe o AdBanner

function MainApp({ user, handleLogout, handleRefresh, refresh, handleLogin }: any) {
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5em', color: '#FAFAFA', marginBottom: '10px' }}>Teens Summer Jobs</h1>
        <p style={{ fontSize: '1.1em', color: '#E0E0E0' }}>Centralize offers and requests for teen services in the US for the summer.</p>
      </header>
      {user ? (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
            <p style={{ fontSize: '1.1em', margin: 0 }}>Welcome, <strong>{user.displayName || user.email}</strong>!</p>
            <button 
              onClick={handleLogout} 
              style={{ padding: '10px 18px', fontSize: '1em', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
          
          <section style={{ marginBottom: '30px' }}>
            <button 
              onClick={() => setShowProfileSettings(!showProfileSettings)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1.2em',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: showProfileSettings ? '20px' : '0'
              }}
            >
              {showProfileSettings ? 'Hide Profile Settings' : 'Show Profile Settings'}
            </button>
            {showProfileSettings && (
              <ProfileConfig onSaved={() => { handleRefresh(); setShowProfileSettings(false); }} />
            )}
          </section>

          <section style={{ marginBottom: '40px' }}>
            <ServiceForm type="oferta" onSaved={handleRefresh} />
          </section>
          <section style={{ marginBottom: '40px' }}>
            <ServiceForm type="demanda" onSaved={handleRefresh} />
          </section>
          <section style={{ marginBottom: '40px' }}>
            <ServiceList key={refresh + 'ofertas'} type="ofertas" />
          </section>
          <section>
            <ServiceList key={refresh + 'demandas'} type="demandas" />
          </section>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button 
            onClick={handleLogin} 
            style={{ padding: '12px 25px', fontSize: '1.2em', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [refresh, setRefresh] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    await signInWithPopup(auth, provider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Função para forçar atualização das listas após salvar
  const handleRefresh = () => setRefresh((r) => r + 1);

  return (
    <>
      {/* Conteúdo principal baseado na rota */}
      {(location.pathname === '/perfil' || location.pathname === '/') ? (
        <MainApp
          user={user}
          handleLogout={handleLogout}
          handleRefresh={handleRefresh}
          refresh={refresh}
          handleLogin={handleLogin}
        />
      ) : location.pathname === '/login' ? (
        <LoginPage />
      ) : (
        <Routes>
          <Route path="/registrar-telefone" element={<PhoneRegisterPage />} />
          <Route path="/adminuserspage" element={<AdminUsersPage />} />
          <Route path="/profile/:userId" element={<ProfileDetails />} />
          {/* Outras rotas do app aqui */}
        </Routes>
      )}
      {/* AdBanner será renderizado aqui, em todas as páginas */}
      {/* Considere adicionar lógica para mostrar o AdBanner apenas se aprovado/configurado */}
       <AdBanner /> 
      {/* Descomente a linha acima QUANDO você tiver configurado seus IDs no AdBanner.tsx e quiser testar */}
    </>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
      {/* Renderize o AdBanner aqui para que ele fique fora do componente App que depende da localização */}
      {/* Isso garante que ele seja renderizado uma vez e permaneça fixo */}
      {/* Lembre-se de configurar seus IDs no AdBanner.tsx antes de descomentar! */}
       <AdBanner /> 
    </Router>
  );
}
