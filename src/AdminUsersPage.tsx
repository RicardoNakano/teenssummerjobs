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

  if (loading) return <div>Loading users...</div>;
  if (isAdmin === false) return <div style={{ color: 'red' }}>Access denied. You are not an administrator.</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', border: '1px solid #ccc', padding: 24, borderRadius: 10 }}>
      <h2>User Administration</h2>
      <div style={{ marginBottom: 24 }}>
        <b>SMS Validation:</b> {smsValidation ? 'Enabled' : 'Disabled'}
        <button onClick={handleToggleSmsValidation} style={{ marginLeft: 16 }}>
          {smsValidation ? 'Disable' : 'Enable'}
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Admin</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.uid} style={{ borderBottom: '1px solid #eee' }}>
              <td>{u.displayName}</td>
              <td>{u.phone}</td>
              <td>{u.admin ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleToggleAdmin(u.uid, u.admin || false)}>
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
