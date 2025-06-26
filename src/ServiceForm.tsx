import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

interface ServiceFormProps {
  type: 'oferta' | 'demanda';
  onSaved?: () => void;
}

export default function ServiceForm({ type, onSaved }: ServiceFormProps) {
  const [form, setForm] = useState({
    servico: '',
    data: '',
    hora: '',
    valor: '',
    endereco: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user] = useAuthState(auth);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      // Busca telefone e nome do usuário no Firestore
      let userPhone = '';
      let userDisplayName = '';
      if (user?.uid) {
        const userDoc = await import('firebase/firestore').then(firestore => firestore.getDoc(firestore.doc(db, 'users', user.uid)));
        if (userDoc.exists()) {
          userPhone = userDoc.data().phone || '';
          userDisplayName = userDoc.data().displayName || user.displayName || user.email || 'Anônimo';
        } else {
          userDisplayName = user.displayName || user.email || 'Anônimo';
        }
      }
      await addDoc(collection(db, type === 'oferta' ? 'ofertas' : 'demandas'), {
        ...form,
        valor: Number(form.valor),
        timestamp: Timestamp.now(),
        userId: user?.uid,
        userName: userDisplayName,
        userPhone,
      });
      setForm({ servico: '', data: '', hora: '', valor: '', endereco: '' });
      setSuccess(true);
      if (onSaved) onSaved();
    } catch (err) {
      alert('Erro ao salvar!');
    }
    setLoading(false);
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      style={{
        marginBottom: '40px', 
        padding: '25px', 
        border: '1px solid rgba(224, 224, 224, 0.3)', 
        borderRadius: '8px', 
        backgroundColor: 'rgba(255, 255, 255, 0.9)'
      }}
    >
      <h2 style={{ fontSize: '1.8em', color: '#333', marginBottom: '25px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        {type === 'oferta' ? 'Offer Service' : 'Request Service'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <input 
          name="servico" 
          placeholder="Service Name (e.g., Babysitting, Lawn Mowing)" 
          value={form.servico} 
          onChange={handleChange} 
          required 
          style={{ padding: '12px 10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fff', color: '#222' }}
        />
        <input 
          name="data" 
          type="date" 
          value={form.data} 
          onChange={handleChange} 
          required 
          style={{ padding: '12px 10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fff', color: '#222' }}
        />
        <input 
          name="hora" 
          type="time" 
          value={form.hora} 
          onChange={handleChange} 
          required 
          style={{ padding: '12px 10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fff', color: '#222' }}
        />
        <input 
          name="valor" 
          type="number" 
          placeholder="Value (USD)" 
          value={form.valor} 
          onChange={handleChange} 
          required 
          style={{ padding: '12px 10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fff', color: '#222' }}
        />
        <input 
          name="endereco" 
          placeholder="Address or General Location" 
          value={form.endereco} 
          onChange={handleChange} 
          required 
          style={{ padding: '12px 10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fff', color: '#222' }}
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{
            padding: '12px 20px', 
            fontSize: '1.1em', 
            backgroundColor: loading ? '#ccc' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer', 
            marginTop: '10px'
          }}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        {success && <span style={{ color: '#28a745', marginLeft: '10px', fontSize: '1.05em', fontWeight: 'bold' }}>Saved successfully!</span>}
      </div>
    </form>
  );
}
