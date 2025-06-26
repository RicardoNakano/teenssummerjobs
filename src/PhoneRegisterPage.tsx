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
    return <div style={{ padding: '20px', fontSize: '1.2em', textAlign: 'center' }}>Redirecting to login...</div>;
  }

  return (
    <div style={{
      maxWidth: '480px', 
      margin: '60px auto', 
      border: '1px solid #ccc', 
      padding: '30px', 
      borderRadius: '10px', 
      backgroundColor: '#f9f9f9'
    }}>
      <h2 style={{ fontSize: '2em', color: '#333', marginBottom: '25px', textAlign: 'center' }}>Register/Change Phone</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          placeholder="+15551234567" 
          style={{ width: 'calc(100% - 22px)', padding: '14px 10px', fontSize: '1.1em', borderRadius: '5px', border: '1px solid #ccc' }} 
        />
        <div id={recaptchaId}></div>
        {!smsSent ? (
          <button 
            onClick={handleSendSMS} 
            disabled={!phone} 
            style={{
              width: '100%', 
              padding: '15px', 
              fontSize: '1.2em', 
              backgroundColor: !phone ? '#ccc' : '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer'
            }}
          >
            Send SMS
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              value={smsCode} 
              onChange={e => setSmsCode(e.target.value)} 
              placeholder="SMS Code" 
              style={{ width: 'calc(100% - 22px)', padding: '14px 10px', fontSize: '1.1em', borderRadius: '5px', border: '1px solid #ccc' }} 
            />
            <button 
              onClick={handleVerifySMS} 
              disabled={verifying} 
              style={{
                width: '100%', 
                padding: '15px', 
                fontSize: '1.2em', 
                backgroundColor: verifying ? '#ccc' : '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer'
              }}
            >
              {verifying ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}
        {success && <span style={{ color: '#28a745', textAlign: 'center', fontSize: '1.1em', fontWeight: 'bold', marginTop: '10px', display: 'block' }}>Phone saved successfully!</span>}
        {error && <span style={{ color: '#dc3545', textAlign: 'center', fontSize: '1.1em', fontWeight: 'bold', marginTop: '10px', display: 'block' }}>{error}</span>}
        <button 
          onClick={() => navigate('/perfil')} 
          style={{
            marginTop: '20px', 
            width: '100%', 
            padding: '12px', 
            fontSize: '1.1em', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
