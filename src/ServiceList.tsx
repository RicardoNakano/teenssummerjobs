import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

interface ServiceItem {
  id: string;
  servico: string;
  data: string;
  hora: string;
  valor: number;
  endereco: string;
  timestamp: any;
  userId?: string;
  userName?: string;
  userPhone?: string;
  deletedAt?: any;
}

interface ServiceListProps {
  type: 'ofertas' | 'demandas';
}

export default function ServiceList({ type }: ServiceListProps) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [user] = useAuthState(auth);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, type), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ServiceItem[]
      );
    });
    return () => unsub();
  }, [type]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    await updateDoc(doc(db, type, id), { deletedAt: Timestamp.now() });
  };

  const filtered = items.filter(item =>
    !item.deletedAt &&
    item.servico.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <h2>{type === 'ofertas' ? 'Service Offers' : 'Service Requests'}</h2>
      <input
        type="text"
        placeholder="Filter by service..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ marginBottom: 12, width: '100%', padding: 4 }}
      />
      {filtered.length === 0 && <p>No records found.</p>}
      <ul>
        {filtered.map((item) => (
          <li key={item.id} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8, borderRadius: 6 }}>
            <b>{item.servico}</b> — {item.data} {item.hora}<br />
            Value: ${item.valor} <br />
            Address: {item.endereco}<br />
            {item.userName && user && (
              <span>Contact: <b>{item.userName}</b>{item.userPhone ? ` | Phone: ${item.userPhone}` : ''}</span>
            )}
            {user && item.userId === user.uid && (
              <button style={{ float: 'right', color: 'red' }} onClick={() => handleDelete(item.id)}>Delete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
