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
  const [videoUrl, setVideoUrl] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPhoneRegister, setShowPhoneRegister] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPhone(data.phone || '');
          setVideoUrl(data.videoUrl || '');
          // Prioritize displayName from Firestore, then auth, then empty string
          setDisplayName(data.displayName || user.displayName || '');
        } else {
          // If no Firestore doc, use auth display name or empty
          setDisplayName(user.displayName || '');
          setVideoUrl('');
        }
      }).catch(() => {
        setDisplayName(user.displayName || '');
        setVideoUrl('');
      });
    }
  }, [user, navigate, success]);

  const handleSave = async () => {
    setError('');
    setSuccess(false); // Reset success message before attempting to save
    try {
      await setDoc(doc(db, 'users', user!.uid), { displayName, phone, videoUrl }, { merge: true });
      await updateProfile(user as User, { displayName });
      setSuccess(true);
      if (onSaved) onSaved();
    } catch (err) {
      setError('Error saving profile. Please try again.');
    }
  };

  return (
    <div style={{ border: '1px solid rgba(204, 204, 204, 0.2)', padding: '25px', borderRadius: '8px', marginBottom: '30px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', backgroundColor: 'rgba(40, 40, 40, 0.8)', color: '#FAFAFA' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.8em', color: '#FAFAFA' }}>Profile Settings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <label style={{ fontSize: '1.1em' }}>
          Display name:
          <input 
            value={displayName} 
            onChange={e => setDisplayName(e.target.value)} 
            placeholder="Your Name" 
            style={{ width: 'calc(100% - 22px)', marginTop: '8px', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }} 
          />
        </label>
        <label style={{ fontSize: '1.1em' }}>
          Presentation video URL (optional):
          <input 
            value={videoUrl} 
            onChange={e => setVideoUrl(e.target.value)} 
            placeholder="https://youtube.com/watch?v=..." 
            style={{ width: 'calc(100% - 22px)', marginTop: '8px', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }} 
          />
        </label>
        <label style={{ fontSize: '1.1em' }}>
          Phone:
          <input 
            value={phone} 
            placeholder="+15551234567" 
            disabled 
            style={{ width: 'calc(100% - 22px)', marginTop: '8px', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(233, 236, 239, 0.2)', color: '#ccc' }} 
          />
        </label>
        <button 
          onClick={() => setShowPhoneRegister(v => !v)} 
          style={{ width: '100%', padding: '12px', fontSize: '1.1em', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {showPhoneRegister ? 'Cancel Phone Registration' : 'Register / Change Phone'}
        </button>
        <button 
          onClick={handleSave} 
          style={{ width: '100%', padding: '14px', fontSize: '1.2em', fontWeight: 'bold', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}
        >
          Save Profile
        </button>
        {success && <span style={{ color: '#28a745', textAlign: 'center', fontSize: '1.1em', fontWeight: 'bold', marginTop: '10px' }}>Profile saved successfully!</span>}
        {error && <span style={{ color: '#dc3545', textAlign: 'center', fontSize: '1.1em', fontWeight: 'bold', marginTop: '10px' }}>{error}</span>}
        
        {showPhoneRegister && (
          <div style={{ marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '25px' }}>
            <PhoneRegisterPageInline onClose={() => setShowPhoneRegister(false)} />
          </div>
        )}
      </div>
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
    if (!/^\\+1\\d{10}$/.test(phone)) { // Corrected regex
      setError('Please use +1 format and 10 digits (e.g., +15551234567)');
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
    <div style={{ maxWidth: '450px', margin: '0 auto', border: '1px solid rgba(221, 221, 221, 0.3)', padding: '25px', borderRadius: '8px', backgroundColor: 'rgba(50, 50, 50, 0.9)' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.5em', color: '#FAFAFA' }}>Register/Change Phone</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          placeholder="+15551234567" 
          style={{ width: 'calc(100% - 22px)', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }} 
        />
        <div id={recaptchaId}></div>
        {smsValidation ? (
          !smsSent ? (
            <button 
              onClick={handleSendSMS} 
              disabled={!phone} 
              style={{ width: '100%', padding: '12px', fontSize: '1.1em', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Send SMS
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                value={smsCode} 
                onChange={e => setSmsCode(e.target.value)} 
                placeholder="SMS Code" 
                style={{ width: 'calc(100% - 22px)', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }} 
              />
              <button 
                onClick={handleVerifySMS} 
                disabled={verifying} 
                style={{ width: '100%', padding: '12px', fontSize: '1.1em', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                {verifying ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          )
        ) : (
          <button 
            onClick={handleSaveSemSms} 
            disabled={!phone} 
            style={{ width: '100%', padding: '12px', fontSize: '1.1em', backgroundColor: '#5a6268', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Save Phone (No SMS Verification)
          </button>
        )}
        {success && <span style={{ color: '#28a745', textAlign: 'center', fontSize: '1.1em', fontWeight: 'bold', marginTop: '10px' }}>Phone saved successfully!</span>}
        {error && <span style={{ color: '#dc3545', textAlign: 'center', fontSize: '1.1em', fontWeight: 'bold', marginTop: '10px' }}>{error}</span>}
        <button 
          onClick={onClose} 
          style={{ marginTop: '20px', width: '100%', padding: '10px', fontSize: '1em', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
