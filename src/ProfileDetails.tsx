import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

export default function ProfileDetails() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser] = useAuthState(auth);
  const [ratings, setRatings] = useState<{stars: number, reviewer: string, reviewerId: string, comment?: string, videoUrl?: string, deleted?: boolean, replyText?: string, replyVideoUrl?: string}[]>([]);
  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState('');
  const [myVideoUrl, setMyVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [replyInputs, setReplyInputs] = useState<{[key: number]: {text: string, videoUrl: string}}>({});
  const [replySubmitting, setReplySubmitting] = useState<{[key: number]: boolean}>({});
  const [replyError, setReplyError] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
      } else {
        setError('Profile not found.');
      }
      setLoading(false);
    }).catch(() => {
      setError('Error loading profile.');
      setLoading(false);
    });
    // Fetch ratings
    import('firebase/firestore').then(async firestore => {
      const ratingsSnap = await firestore.getDocs(firestore.collection(db, `users/${userId}/ratings`));
      const stars: {stars: number, reviewer: string, reviewerId: string, comment?: string, videoUrl?: string, deleted?: boolean, replyText?: string, replyVideoUrl?: string}[] = [];
      ratingsSnap.forEach(doc => {
        const d = doc.data();
        if (typeof d.stars === 'number' && !d.deleted) stars.push({
          stars: d.stars,
          reviewer: d.reviewer || '',
          reviewerId: d.reviewerId || '',
          comment: d.comment || '',
          videoUrl: d.videoUrl || '',
          deleted: d.deleted || false,
          replyText: d.replyText || '',
          replyVideoUrl: d.replyVideoUrl || ''
        });
      });
      setRatings(stars);
    });
  }, [userId, successMsg]);

  const handleStarClick = (star: number) => {
    setMyRating(star);
    setRatingError('');
  };

  const handleSubmitRating = async () => {
    setSubmitting(true);
    setRatingError('');
    setSuccessMsg('');
    try {
      if (!currentUser || !currentUser.uid || !userId) throw new Error('You must be logged in.');
      await import('firebase/firestore').then(firestore =>
        firestore.addDoc(
          firestore.collection(db, `users/${userId}/ratings`),
          {
            stars: myRating,
            reviewer: currentUser.displayName || currentUser.email || 'Anonymous',
            reviewerId: currentUser.uid,
            comment: myComment,
            videoUrl: myVideoUrl,
            createdAt: new Date()
          }
        )
      );
      setSuccessMsg('Thank you for your rating!');
      setMyComment('');
      setMyVideoUrl('');
      setMyRating(0);
    } catch (e) {
      setRatingError('Error submitting rating.');
    }
    setSubmitting(false);
  };

  const handleDeleteReview = async (reviewIdx: number) => {
    if (!currentUser || !userId) return;
    setSubmitting(true);
    setRatingError('');
    setSuccessMsg('');
    try {
      // Buscar o snapshot dos reviews para pegar o id do documento
      const firestore = await import('firebase/firestore');
      const ratingsSnap = await firestore.getDocs(firestore.collection(db, `users/${userId}/ratings`));
      let docIdToDelete = '';
      let i = 0;
      ratingsSnap.forEach(doc => {
        const d = doc.data();
        if (typeof d.stars === 'number' && !d.deleted) {
          if (i === reviewIdx) docIdToDelete = doc.id;
          i++;
        }
      });
      if (docIdToDelete) {
        await firestore.updateDoc(
          firestore.doc(db, `users/${userId}/ratings/${docIdToDelete}`),
          { deleted: true }
        );
        setSuccessMsg('Review deleted!');
      }
    } catch (e) {
      setRatingError('Error deleting review.');
    }
    setSubmitting(false);
  };

  const handleReplyChange = (idx: number, field: 'text' | 'videoUrl', value: string) => {
    setReplyInputs(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value
      }
    }));
  };

  const handleReplySubmit = async (idx: number) => {
    if (!currentUser || !userId || !profile) return;
    setReplySubmitting(prev => ({ ...prev, [idx]: true }));
    setReplyError(prev => ({ ...prev, [idx]: '' }));
    try {
      // Buscar o snapshot dos reviews para pegar o id do documento
      const firestore = await import('firebase/firestore');
      const ratingsSnap = await firestore.getDocs(firestore.collection(db, `users/${userId}/ratings`));
      let docIdToReply = '';
      let i = 0;
      ratingsSnap.forEach(doc => {
        const d = doc.data();
        if (typeof d.stars === 'number' && !d.deleted) {
          if (i === idx) docIdToReply = doc.id;
          i++;
        }
      });
      if (docIdToReply) {
        await firestore.updateDoc(
          firestore.doc(db, `users/${userId}/ratings/${docIdToReply}`),
          {
            replyText: replyInputs[idx]?.text || '',
            replyVideoUrl: replyInputs[idx]?.videoUrl || ''
          }
        );
        setSuccessMsg('Reply saved!');
      }
    } catch (e) {
      setReplyError(prev => ({ ...prev, [idx]: 'Error saving reply.' }));
    }
    setReplySubmitting(prev => ({ ...prev, [idx]: false }));
  };

  const handleDeleteReply = async (idx: number) => {
    if (!currentUser || !userId || !profile) return;
    setReplySubmitting(prev => ({ ...prev, [idx]: true }));
    setReplyError(prev => ({ ...prev, [idx]: '' }));
    try {
      const firestore = await import('firebase/firestore');
      const ratingsSnap = await firestore.getDocs(firestore.collection(db, `users/${userId}/ratings`));
      let docIdToReply = '';
      let i = 0;
      ratingsSnap.forEach(doc => {
        const d = doc.data();
        if (typeof d.stars === 'number' && !d.deleted) {
          if (i === idx) docIdToReply = doc.id;
          i++;
        }
      });
      if (docIdToReply) {
        await firestore.updateDoc(
          firestore.doc(db, `users/${userId}/ratings/${docIdToReply}`),
          {
            replyText: '',
            replyVideoUrl: ''
          }
        );
        setSuccessMsg('Reply deleted!');
      }
    } catch (e) {
      setReplyError(prev => ({ ...prev, [idx]: 'Error deleting reply.' }));
    }
    setReplySubmitting(prev => ({ ...prev, [idx]: false }));
  };

  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b.stars, 0) / ratings.length) : 0;

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!profile) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '30px auto', border: '1px solid rgba(204, 204, 204, 0.2)', padding: '30px', borderRadius: '10px', backgroundColor: 'rgba(40, 40, 40, 0.8)', color: '#FAFAFA' }}>
      <h2 style={{ fontSize: '2em', color: '#FAFAFA', marginBottom: '25px', textAlign: 'center', borderBottom: '2px solid rgba(238, 238, 238, 0.1)', paddingBottom: '15px' }}>Profile Details</h2>
      
      <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid rgba(238, 238, 238, 0.1)' }}>
        <p style={{ fontSize: '1.2em', margin: '8px 0' }}><b>Name:</b> {profile.displayName || 'N/A'}</p>
        <p style={{ fontSize: '1.2em', margin: '8px 0' }}><b>Phone:</b> {profile.phone || 'N/A'}</p>
        {profile.videoUrl && (
          <div style={{ marginTop: '15px' }}>
            <b style={{ fontSize: '1.2em' }}>Presentation Video:</b><br />
            <a href={profile.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.1em', color: '#58a6ff' }}>{profile.videoUrl}</a>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(238, 238, 238, 0.1)' }}>
        <h3 style={{ fontSize: '1.5em', color: '#e0e0e0', marginBottom: '15px' }}>Average Rating</h3>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.2em' }}>
          <span style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#f1c40f', marginRight: '10px' }}>{avgRating.toFixed(1)}</span>
          <span>
            {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(avgRating) ? '#FFD700' : '#444', fontSize: '1.8em' }}>★</span>)}
          </span>
          <span style={{ fontSize: '1em', color: '#bbb', marginLeft: '10px' }}> ({ratings.length} ratings)</span>
        </div>
      </div>

      {currentUser && currentUser.uid !== userId && (
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid rgba(221, 221, 221, 0.2)', borderRadius: '8px', backgroundColor: 'rgba(50, 50, 50, 0.85)' }}>
          <h3 style={{ fontSize: '1.5em', color: '#e0e0e0', marginBottom: '20px', marginTop: 0 }}>Rate this User</h3>
          <div style={{ marginBottom: '15px' }}>
            {[1,2,3,4,5].map(i => (
              <span
                key={i}
                style={{ cursor: 'pointer', color: i <= myRating ? '#FFD700' : '#555', fontSize: '2.5em', marginRight: '5px' }}
                onClick={() => handleStarClick(i)}
              >★</span>
            ))}
          </div>
          <textarea
            value={myComment}
            onChange={e => setMyComment(e.target.value)}
            placeholder="Write a comment (optional)"
            style={{ width: 'calc(100% - 22px)', minHeight: '70px', marginBottom: '15px', padding: '10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }}
          />
          <input
            value={myVideoUrl}
            onChange={e => setMyVideoUrl(e.target.value)}
            placeholder="Video review URL (e.g., YouTube, Vimeo - optional)"
            style={{ width: 'calc(100% - 22px)', marginBottom: '20px', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }}
          />
          <button 
            onClick={handleSubmitRating} 
            disabled={submitting || !myRating} 
            style={{ padding: '12px 20px', fontSize: '1.1em', backgroundColor: (submitting || !myRating) ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
          {ratingError && <div style={{ color: '#dc3545', marginTop: '10px', fontSize: '1.05em' }}>{ratingError}</div>}
          {successMsg && <div style={{ color: '#28a745', marginTop: '10px', fontSize: '1.05em' }}>{successMsg}</div>}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '1.7em', color: '#e0e0e0', marginBottom: '20px', borderBottom: '2px solid rgba(238, 238, 238, 0.1)', paddingBottom: '10px' }}>Reviews</h3>
        {ratings.length === 0 && <p style={{ fontSize: '1.1em', color: '#ccc' }}>No reviews yet for this user.</p>}
        <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
          {ratings.map((r, idx) => (
            r.deleted ? null : (
              <li key={idx} style={{ borderBottom: '1px solid rgba(238, 238, 238, 0.1)', padding: '20px 0', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ color: '#FFD700', fontSize: '1.5em' }}>
                      {[1,2,3,4,5].map(i => <span key={i}>{i <= r.stars ? '★' : '☆'}</span>)}
                    </span>
                    <span style={{ marginLeft: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                      <Link to={`/profile/${r.reviewerId}`} style={{ color: '#58a6ff', textDecoration: 'underline' }}>
                        {r.reviewer || 'Anonymous'}
                      </Link>
                    </span>
                  </div>
                  {currentUser && r.reviewerId === currentUser.uid && (
                    <button onClick={() => handleDeleteReview(idx)} style={{ padding: '6px 10px', fontSize: '0.9em', color: '#dc3545', backgroundColor: 'transparent', border: '1px solid #dc3545', borderRadius: '5px', cursor: 'pointer' }} disabled={submitting}>
                      Delete
                    </button>
                  )}
                </div>
                {r.comment && (
                  <p style={{ marginTop: '8px', fontSize: '1.05em', color: '#ddd', fontStyle: 'italic', lineHeight: '1.6' }}>{r.comment}</p>
                )}
                {r.videoUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1em', color: '#58a6ff' }}>Watch Video Review</a>
                  </div>
                )}

                {/* Reply section for profile owner */}
                {currentUser && profile && currentUser.uid === userId && !(r.replyText || r.replyVideoUrl) && (
                  <div style={{ marginTop: '15px', background: 'rgba(240, 240, 240, 0.1)', padding: '15px', borderRadius: '6px' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '1.1em', color: '#e0e0e0', marginTop: 0 }}>Reply to this review:</h4>
                    <textarea
                      value={replyInputs[idx]?.text || ''}
                      onChange={e => handleReplyChange(idx, 'text', e.target.value)}
                      placeholder="Write your reply (optional)"
                      style={{ width: 'calc(100% - 22px)', minHeight: '60px', marginBottom: '10px', padding: '10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }}
                    />
                    <input
                      value={replyInputs[idx]?.videoUrl || ''}
                      onChange={e => handleReplyChange(idx, 'videoUrl', e.target.value)}
                      placeholder="Reply video URL (optional)"
                      style={{ width: 'calc(100% - 22px)', marginBottom: '15px', padding: '12px 10px', fontSize: '1em', borderRadius: '5px', border: '1px solid rgba(204, 204, 204, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF' }}
                    />
                    <button onClick={() => handleReplySubmit(idx)} disabled={replySubmitting[idx]} style={{ padding: '10px 15px', fontSize: '1em', backgroundColor: replySubmitting[idx] ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                      {replySubmitting[idx] ? 'Saving Reply...' : 'Save Reply'}
                    </button>
                    {replyError[idx] && <div style={{ color: '#dc3545', marginTop: '8px', fontSize: '1em' }}>{replyError[idx]}</div>}
                  </div>
                )}
                {/* Show reply if exists */}
                {(r.replyText || r.replyVideoUrl) && (
                  <div style={{ marginTop: '15px', marginLeft: '20px', background: 'rgba(233, 245, 255, 0.1)', padding: '15px', borderRadius: '6px', borderLeft: '3px solid #58a6ff' }}>
                    <div style={{ fontWeight: 'bold', color: '#a8cfff', fontSize: '1.1em', marginBottom: '8px' }}>Reply from {profile.displayName || 'profile owner'}:</div>
                    {r.replyText && <p style={{ marginTop: '5px', fontSize: '1.05em', color: '#ddd', lineHeight: '1.6' }}>{r.replyText}</p>}
                    {r.replyVideoUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <a href={r.replyVideoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1em', color: '#58a6ff' }}>Watch Reply Video</a>
                      </div>
                    )}
                    {currentUser && profile && currentUser.uid === userId && (
                      <button onClick={() => handleDeleteReply(idx)} disabled={replySubmitting[idx]} style={{ marginTop: '12px', padding: '6px 10px', fontSize: '0.9em', color: '#c82333', backgroundColor: 'transparent', border: '1px solid #c82333', borderRadius: '5px', cursor: 'pointer' }}>
                        Delete Reply
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <Link to="/" style={{ padding: '12px 25px', fontSize: '1.1em', color: '#fff', backgroundColor: 'rgba(108, 117, 125, 0.8)', textDecoration: 'none', borderRadius: '5px' }}>Back to Home</Link>
      </div>
    </div>
  );
}
