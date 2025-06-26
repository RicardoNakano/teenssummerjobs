import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

// Tipagem para window customizado
interface CustomWindow extends Window {
  recaptchaVerifier?: RecaptchaVerifier;
  confirmationResult?: any;
}
declare const window: CustomWindow;

export default function PhoneRegisterPage() {
  const [user] = useAuthState(auth);
  const [phone, setPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recaptchaId] = useState(() => 'recaptcha-' + Math.random().toString(36).slice(2));
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.recaptchaVerifier && document.getElementById(recaptchaId)) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaId, { size: 'invisible' });
      window.recaptchaVerifier.render();
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, [recaptchaId]);

  const handleSendSMS = async () => {
    setError('');
    if (!/^[+]{1}1\d{10}$/.test(phone)) {
      setError('Use o formato +1 e 10 dígitos (ex: +15551234567)');
      return;
    }
    try {
      if (!window.recaptchaVerifier) {
        setError('Erro interno: Recaptcha não inicializado. Recarregue a página.');
        return;
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      window.confirmationResult = confirmation;
      setSmsSent(true);
      setError('');
    } catch (err: any) {
      setError('Erro ao enviar SMS: ' + (err?.message || 'Verifique o console do navegador para detalhes.'));
    }
  };

  const handleVerifySMS = async () => {
    setVerifying(true);
    setError('');
    try {
      await window.confirmationResult.confirm(smsCode);
      // Salva telefone no Firestore
      await setDoc(doc(db, 'users', user!.uid), { phone }, { merge: true });
      setSuccess(true);
      setSmsSent(false);
      setSmsCode('');
      setTimeout(() => navigate('/perfil'), 1200);
    } catch (err) {
      setError('Código inválido.');
    }
    setVerifying(false);
  };

  if (!user) {
    // Redireciona para login se não estiver logado
    useEffect(() => {
      navigate('/login');
    }, [navigate]);
    return <div>Redirecionando para login...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', border: '1px solid #ccc', padding: 24, borderRadius: 10 }}>
      <h2>Registrar/Alterar Telefone</h2>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+15551234567" style={{ width: '100%', marginBottom: 8 }} />
      <div id={recaptchaId}></div>
      {!smsSent ? (
        <button onClick={handleSendSMS} disabled={!phone} style={{ width: '100%' }}>Enviar SMS</button>
      ) : (
        <div>
          <input value={smsCode} onChange={e => setSmsCode(e.target.value)} placeholder="Código SMS" style={{ width: '100%', marginBottom: 8 }} />
          <button onClick={handleVerifySMS} disabled={verifying} style={{ width: '100%' }}>Verificar</button>
        </div>
      )}
      {success && <span style={{ color: 'green', marginLeft: 8 }}>Telefone salvo!</span>}
      {error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
      <button onClick={() => navigate('/perfil')} style={{ marginTop: 16, width: '100%' }}>Cancelar</button>
    </div>
  );
}
