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
    <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid rgba(224, 224, 224, 0.2)', borderRadius: '8px', backgroundColor: 'rgba(40, 40, 40, 0.8)' }}>
      <h2 style={{ fontSize: '1.8em', color: '#FAFAFA', marginBottom: '20px', borderBottom: '2px solid rgba(238, 238, 238, 0.1)', paddingBottom: '10px' }}>
        {type === 'ofertas' ? 'Service Offers' : 'Service Requests'}
      </h2>
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
          border: '1px solid rgba(204, 204, 204, 0.3)', 
          borderRadius: '5px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: '#FFF'
        }}
      />
      {filtered.length === 0 && <p style={{ fontSize: '1.1em', color: '#ccc' }}>No records found.</p>}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {filtered.map((item) => (
          <li 
            key={item.id} 
            style={{
              marginBottom: '20px', 
              border: '1px solid rgba(221, 221, 221, 0.2)', 
              padding: '18px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(50, 50, 50, 0.85)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.4em', color: '#e0e0e0', marginBottom: '8px', marginTop: 0 }}>{item.servico}</h3>
                <p style={{ margin: '4px 0', fontSize: '1em', color: '#ccc' }}>Date: {item.data} at {item.hora}</p>
                <p style={{ margin: '4px 0', fontSize: '1em', color: '#ccc' }}>Value: <strong>${item.valor}</strong></p>
                <p style={{ margin: '4px 0', fontSize: '1em', color: '#ccc' }}>Address: {item.endereco}</p>
                {item.userName && user && (
                  <div style={{ marginTop: '12px', fontSize: '1em', color: '#ccc' }}>
                    Contact: 
                    <Link to={`/profile/${item.userId}`} style={{ color: '#58a6ff', textDecoration: 'underline', fontWeight: 'bold' }}>
                      {item.userName}
                    </Link>
                    {item.userPhone ? ` | Phone: ${item.userPhone}` : ''}
                    {item.userId && userRatings[item.userId as string] !== undefined && (
                      <span style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center' }}>
                        {[1,2,3,4,5].map(i => (
                          <span key={i} style={{ color: i <= Math.round(userRatings[item.userId as string]) ? '#FFD700' : '#ccc', fontSize: '1.3em' }}>★</span>
                        ))}
                        <span style={{ fontSize: '0.9em', color: '#aaa', marginLeft: '5px' }}>
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
