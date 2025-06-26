import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { updateProfile, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// Tipagem para window customizado
interface CustomWindow extends Window {
  recaptchaVerifier?: RecaptchaVerifier;
  confirmationResult?: any;
}
declare const window: CustomWindow;

export default function ProfileConfig({ onSaved }: { onSaved?: () => void }) {
  const [user] = useAuthState(auth);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPhoneRegister, setShowPhoneRegister] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Busca sempre o nome atualizado do Firestore
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPhone(data.phone || '');
          // Se displayName não existe ou é vazio, mostra string vazia
          setDisplayName((data.displayName !== undefined && data.displayName !== null) ? String(data.displayName) : '');
        } else {
          setDisplayName('');
        }
      }).catch(() => {
        setDisplayName('');
      });
    }
  }, [user, navigate, success]);

  const handleSave = async () => {
    setError('');
    try {
      await setDoc(doc(db, 'users', user!.uid), { displayName, phone }, { merge: true });
      await updateProfile(user as User, { displayName });
      setSuccess(true);
      if (onSaved) onSaved();
    } catch (err) {
      setError('Erro ao salvar.');
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, marginBottom: 24 }}>
      <h2>Profile Settings</h2>
      <label>Display name:</label>
      <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name" />
      <button onClick={handleSave} style={{ marginLeft: 8, marginBottom: 8 }}>Save Name</button>
      <label>Phone (+1...):</label>
      <input value={phone} placeholder="+15551234567" disabled />
      <button onClick={() => setShowPhoneRegister(v => !v)} style={{ marginLeft: 8 }}>Register/Change Phone</button>
      {showPhoneRegister && (
        <div style={{ marginTop: 24 }}>
          <PhoneRegisterPageInline onClose={() => setShowPhoneRegister(false)} />
        </div>
      )}
      {success && <span style={{ color: 'green', marginLeft: 8 }}>Saved!</span>}
      {error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
    </div>
  );
}

// Inline phone registration component, no navigation
function PhoneRegisterPageInline({ onClose }: { onClose: () => void }) {
  const [user] = useAuthState(auth);
  const [phone, setPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recaptchaId] = useState(() => 'recaptcha-' + Math.random().toString(36).slice(2));
  const [smsValidation, setSmsValidation] = useState(true);

  useEffect(() => {
    import('firebase/firestore').then(async firestore => {
      const configDoc = await firestore.getDoc(firestore.doc(db, 'config', 'global'));
      if (configDoc.exists()) {
        setSmsValidation(!!configDoc.data().smsValidation);
      }
    });
  }, []);

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
      await setDoc(doc(db, 'users', user!.uid), { phone }, { merge: true });
      setSuccess(true);
      setSmsSent(false);
      setSmsCode('');
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError('Código inválido.');
    }
    setVerifying(false);
  };

  const handleSaveSemSms = async () => {
    setError('');
    try {
      await setDoc(doc(db, 'users', user!.uid), { phone }, { merge: true });
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError('Erro ao salvar telefone.');
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', border: '1px solid #ccc', padding: 24, borderRadius: 10 }}>
      <h2>Register/Change Phone</h2>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+15551234567" style={{ width: '100%', marginBottom: 8 }} />
      <div id={recaptchaId}></div>
      {smsValidation ? (
        !smsSent ? (
          <button onClick={handleSendSMS} disabled={!phone} style={{ width: '100%' }}>Send SMS</button>
        ) : (
          <div>
            <input value={smsCode} onChange={e => setSmsCode(e.target.value)} placeholder="SMS Code" style={{ width: '100%', marginBottom: 8 }} />
            <button onClick={handleVerifySMS} disabled={verifying} style={{ width: '100%' }}>Verify</button>
          </div>
        )
      ) : (
        <button onClick={handleSaveSemSms} disabled={!phone} style={{ width: '100%' }}>Save Phone (no SMS)</button>
      )}
      {success && <span style={{ color: 'green', marginLeft: 8 }}>Phone saved!</span>}
      {error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
      <button onClick={onClose} style={{ marginTop: 16, width: '100%' }}>Cancel</button>
    </div>
  );
}
