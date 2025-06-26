import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';

interface UserDoc {
  uid: string;
  displayName: string;
  phone?: string;
  admin?: boolean;
}

export default function AdminUsersPage() {
  const [user] = useAuthState(auth);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [smsValidation, setSmsValidation] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      // Do not redirect, just show message
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const data = snap.data();
      if (!snap.exists() || !data || data.admin !== true) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      getDocs(collection(db, 'users')).then(snapshot => {
        const list: UserDoc[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            uid: docSnap.id,
            displayName: data.displayName || '',
            phone: data.phone || '',
            admin: !!data.admin,
          });
        });
        setUsers(list);
        setLoading(false);
      }).catch(() => {
        setError('Error fetching users.');
        setLoading(false);
      });
    });
  }, [user, navigate]);

  // Fetch global SMS validation flag
  useEffect(() => {
    import('firebase/firestore').then(async firestore => {
      const configDoc = await firestore.getDoc(firestore.doc(db, 'config', 'global'));
      if (configDoc.exists()) {
        setSmsValidation(!!configDoc.data().smsValidation);
      }
    });
  }, []);

  const handleToggleAdmin = async (uid: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { admin: !current });
      setUsers(users => users.map(u => u.uid === uid ? { ...u, admin: !current } : u));
    } catch {
      setError('Error updating admin status.');
    }
  };

  // Update global SMS validation flag
  const handleToggleSmsValidation = async () => {
    try {
      await setDoc(doc(db, 'config', 'global'), { smsValidation: !smsValidation }, { merge: true });
      setSmsValidation(v => !v);
    } catch {
      setError('Error updating SMS flag.');
    }
  };

  if (loading) return <div style={{ padding: '20px', fontSize: '1.2em', textAlign: 'center' }}>Loading users...</div>;
  if (isAdmin === false) return <div style={{ padding: '20px', fontSize: '1.2em', color: 'red', textAlign: 'center', fontWeight: 'bold' }}>Access Denied: You are not an administrator.</div>;
  if (error) return <div style={{ padding: '20px', fontSize: '1.2em', color: 'red', textAlign: 'center' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', border: '1px solid #ccc', padding: '30px', borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ fontSize: '2em', color: '#2c3e50', marginBottom: '30px', textAlign: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>User Administration</h2>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
        <b style={{ fontSize: '1.2em', color: '#34495e' }}>SMS Validation:</b> 
        <span style={{ fontSize: '1.1em', marginLeft: '10px', fontWeight: smsValidation ? 'bold' : 'normal', color: smsValidation ? '#28a745' : '#dc3545'}}>
          {smsValidation ? 'Enabled' : 'Disabled'}
        </span>
        <button 
          onClick={handleToggleSmsValidation} 
          style={{
            marginLeft: '20px', 
            padding: '10px 18px', 
            fontSize: '1em', 
            color: 'white', 
            backgroundColor: smsValidation ? '#ffc107' : '#007bff', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer'
          }}
        >
          {smsValidation ? 'Disable SMS Validation' : 'Enable SMS Validation'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
        <thead style={{ backgroundColor: '#e9ecef' }}>
          <tr>
            <th style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em', color: '#495057' }}>Name</th>
            <th style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em', color: '#495057' }}>Phone</th>
            <th style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em', color: '#495057' }}>Admin</th>
            <th style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em', color: '#495057' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.uid} style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <td style={{ padding: '15px', fontSize: '1.05em' }}>{u.displayName}</td>
              <td style={{ padding: '15px', fontSize: '1.05em' }}>{u.phone || '-'}</td>
              <td style={{ padding: '15px', fontSize: '1.05em', color: u.admin ? '#28a745' : '#6c757d', fontWeight: 'bold' }}>{u.admin ? 'Yes' : 'No'}</td>
              <td style={{ padding: '15px' }}>
                <button 
                  onClick={() => handleToggleAdmin(u.uid, u.admin || false)} 
                  style={{
                    padding: '10px 15px', 
                    fontSize: '1em', 
                    color: 'white', 
                    backgroundColor: u.admin ? '#dc3545' : '#28a745', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer'
                  }}
                >
                  {u.admin ? 'Remove Admin' : 'Make Admin'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
