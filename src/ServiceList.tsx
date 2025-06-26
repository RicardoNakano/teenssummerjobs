import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { Link } from 'react-router-dom';

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
  const [fetchError, setFetchError] = useState(''); // Para mostrar erros de conexão

  useEffect(() => {
    const q = query(collection(db, type), orderBy('timestamp', 'desc'));
    // Adicionado tratamento de erro ao listener
    const unsub = onSnapshot(q, 
      (snapshot) => {
        setFetchError(''); // Limpa o erro se a conexão for bem-sucedida
        setItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ServiceItem[]
        );
      },
      (error) => {
        console.error(`Firestore listener for ${type} failed:`, error);
        setFetchError('Could not load real-time data. Please check your connection and refresh the page.');
      }
    );
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

  // Calculate average rating for each userId
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    // For all unique userIds in filtered, fetch their ratings
    const userIds = Array.from(new Set(filtered.map(item => item.userId).filter((id): id is string => !!id)));
    if (userIds.length === 0) return;
    userIds.forEach(uid => {
      import('firebase/firestore').then(async firestore => {
        const ratingsSnap = await firestore.getDocs(firestore.collection(db, `users/${uid}/ratings`));
        const stars: number[] = [];
        ratingsSnap.forEach(doc => {
          const d = doc.data();
          if (typeof d.stars === 'number') stars.push(d.stars);
        });
        setUserRatings(prev => ({ ...prev, [uid]: stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : 0 }));
      });
    });
  }, [filtered]);

  return (
    <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid rgba(224, 224, 224, 0.3)', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
      <h2 style={{ fontSize: '1.8em', color: '#333', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        {type === 'ofertas' ? 'Service Offers' : 'Service Requests'}
      </h2>
      {fetchError && <p style={{ color: 'red', fontWeight: 'bold', padding: '10px', border: '1px solid red', borderRadius: '5px' }}>{fetchError}</p>}
      <input
        type="text"
        placeholder="Filter by service name..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ 
          marginBottom: '25px', 
          width: 'calc(100% - 22px)', 
          padding: '12px 10px', 
          fontSize: '1em', 
          border: '1px solid #ccc', 
          borderRadius: '5px',
          backgroundColor: '#fff',
          color: '#222'
        }}
      />
      {filtered.length === 0 && <p style={{ fontSize: '1.1em', color: '#555' }}>No records found.</p>}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {filtered.map((item) => (
          <li 
            key={item.id} 
            style={{
              marginBottom: '20px', 
              border: '1px solid #ddd', 
              padding: '18px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.4em', color: '#2c3e50', marginBottom: '8px', marginTop: 0 }}>{item.servico}</h3>
                <p style={{ margin: '4px 0', fontSize: '1em', color: '#555' }}>Date: {item.data} at {item.hora}</p>
                <p style={{ margin: '4px 0', fontSize: '1em', color: '#555' }}>Value: <strong>${item.valor}</strong></p>
                <p style={{ margin: '4px 0', fontSize: '1em', color: '#555' }}>Address: {item.endereco}</p>
                {item.userName && user && (
                  <div style={{ marginTop: '12px', fontSize: '1em', color: '#555' }}>
                    Contact: 
                    <Link to={`/profile/${item.userId}`} style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'bold' }}>
                      {item.userName}
                    </Link>
                    {/* Telefone agora é um link "tel:" */}
                    {item.userPhone ? 
                      <span style={{ whiteSpace: 'nowrap' }}> | Phone: <a href={`tel:${item.userPhone}`} style={{ color: '#007bff' }}>{item.userPhone}</a></span> 
                      : ''}
                    {item.userId && userRatings[item.userId as string] !== undefined && (
                      <span style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center' }}>
                        {[1,2,3,4,5].map(i => (
                          <span key={i} style={{ color: i <= Math.round(userRatings[item.userId as string]) ? '#FFD700' : '#ccc', fontSize: '1.3em' }}>★</span>
                        ))}
                        <span style={{ fontSize: '0.9em', color: '#777', marginLeft: '5px' }}>
                          ({userRatings[item.userId as string].toFixed(1)})
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              {user && item.userId === user.uid && (
                <button 
                  style={{ 
                    padding: '8px 15px', 
                    fontSize: '0.95em', 
                    color: 'white', 
                    backgroundColor: '#e74c3c', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer', 
                    marginLeft: '15px'
                  }} 
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
