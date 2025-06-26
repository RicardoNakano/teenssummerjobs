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
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h2>{type === 'oferta' ? 'Offer Service' : 'Request Service'}</h2>
      <input name="servico" placeholder="Service" value={form.servico} onChange={handleChange} required />
      <input name="data" type="date" value={form.data} onChange={handleChange} required />
      <input name="hora" type="time" value={form.hora} onChange={handleChange} required />
      <input name="valor" type="number" placeholder="Value (USD)" value={form.valor} onChange={handleChange} required />
      <input name="endereco" placeholder="Address" value={form.endereco} onChange={handleChange} required />
      <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      {success && <span style={{ color: 'green', marginLeft: 8 }}>Saved!</span>}
    </form>
  );
}
