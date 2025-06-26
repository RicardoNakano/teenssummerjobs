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

function MainApp({ user, handleLogout, handleRefresh, refresh, handleLogin }: any) {
  return (
    <div className="container">
      <h1>Teens Summer Jobs</h1>
      <p>Centralize offers and requests for teen services in the US for the summer.</p>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}!</p>
          <button onClick={handleLogout}>Logout</button>
          <ProfileConfig onSaved={handleRefresh} />
          <ServiceForm type="oferta" onSaved={handleRefresh} />
          <ServiceForm type="demanda" onSaved={handleRefresh} />
          <ServiceList key={refresh + 'ofertas'} type="ofertas" />
          <ServiceList key={refresh + 'demandas'} type="demandas" />
        </div>
      ) : (
        <button onClick={handleLogin}>Sign in with Google</button>
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
      {/* Sempre mostra MainApp na rota /perfil ou / */}
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
          {/* Outras rotas do app aqui */}
        </Routes>
      )}
    </>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
