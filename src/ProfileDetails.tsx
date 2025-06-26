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
  const [reviewUrl, setReviewUrl] = useState('');
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
        setReviewUrl(data.reviewUrl || '');
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

  const handleSaveReviewUrl = async () => {
    setSubmitting(true);
    setSuccessMsg('');
    setRatingError('');
    try {
      if (!userId) throw new Error('No userId');
      await import('firebase/firestore').then(firestore =>
        firestore.setDoc(
          firestore.doc(db, 'users/' + userId),
          { reviewUrl },
          { merge: true }
        )
      );
      setSuccessMsg('Review video URL saved!');
    } catch {
      setRatingError('Error saving review video URL.');
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
    <div style={{ maxWidth: 400, margin: '40px auto', border: '1px solid #ccc', padding: 24, borderRadius: 10 }}>
      <h2>Profile Details</h2>
      <div><b>Name:</b> {profile.displayName || 'N/A'}</div>
      <div><b>Phone:</b> {profile.phone || 'N/A'}</div>
      {profile.videoUrl && (
        <div style={{ marginTop: 16 }}>
          <b>Presentation Video:</b><br />
          <a href={profile.videoUrl} target="_blank" rel="noopener noreferrer">{profile.videoUrl}</a>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <b>Average Rating:</b> {avgRating.toFixed(1)}{' '}
        <span>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(avgRating) ? '#FFD700' : '#ccc', fontSize: 20 }}>★</span>)}</span>
        <span style={{ fontSize: 12, color: '#888' }}> ({ratings.length} ratings)</span>
      </div>
      <div style={{ marginTop: 16 }}>
        <b>Rate this user:</b><br />
        {[1,2,3,4,5].map(i => (
          <span
            key={i}
            style={{ cursor: 'pointer', color: i <= myRating ? '#FFD700' : '#ccc', fontSize: 28 }}
            onClick={() => handleStarClick(i)}
          >★</span>
        ))}
        <div style={{ marginTop: 8 }}>
          <textarea
            value={myComment}
            onChange={e => setMyComment(e.target.value)}
            placeholder="Write a comment (optional)"
            style={{ width: '100%', minHeight: 48, marginBottom: 4 }}
          />
          <input
            value={myVideoUrl}
            onChange={e => setMyVideoUrl(e.target.value)}
            placeholder="Video review URL (optional)"
            style={{ width: '100%', marginBottom: 4 }}
          />
        </div>
        <button onClick={handleSubmitRating} disabled={submitting || !myRating} style={{ marginLeft: 8 }}>Submit</button>
        {ratingError && <div style={{ color: 'red' }}>{ratingError}</div>}
        {successMsg && <div style={{ color: 'green' }}>{successMsg}</div>}
      </div>
      {/* Reviews List */}
      <div style={{ marginTop: 32 }}>
        <h3>Reviews</h3>
        {ratings.length === 0 && <div>No reviews yet.</div>}
        <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
          {ratings.map((r, idx) => (
            r.deleted ? null : (
              <li key={idx} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                <span style={{ color: '#FFD700', fontSize: 18 }}>
                  {[1,2,3,4,5].map(i => <span key={i}>{i <= r.stars ? '★' : '☆'}</span>)}
                </span>
                <span style={{ marginLeft: 8 }}>
                  <Link to={`/profile/${r.reviewerId}`} style={{ color: '#4af', textDecoration: 'underline' }}>
                    {r.reviewer || 'Anonymous'}
                  </Link>
                </span>
                {r.comment && (
                  <div style={{ marginTop: 4, fontStyle: 'italic', color: '#444' }}>{r.comment}</div>
                )}
                {r.videoUrl && (
                  <div style={{ marginTop: 4 }}>
                    <a href={r.videoUrl} target="_blank" rel="noopener noreferrer">Video Review</a>
                  </div>
                )}
                {currentUser && r.reviewerId === currentUser.uid && (
                  <button onClick={() => handleDeleteReview(idx)} style={{ marginLeft: 12, color: '#c00', background: 'none', border: 'none', cursor: 'pointer' }} disabled={submitting}>
                    Delete
                  </button>
                )}
                {/* Reply section for profile owner */}
                {currentUser && profile && currentUser.uid === userId && !(r.replyText || r.replyVideoUrl) && (
                  <div style={{ marginTop: 12, background: '#f9f9f9', padding: 8, borderRadius: 6 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>Reply to this review:</div>
                    <textarea
                      value={replyInputs[idx]?.text || ''}
                      onChange={e => handleReplyChange(idx, 'text', e.target.value)}
                      placeholder="Write a reply (optional)"
                      style={{ width: '100%', minHeight: 36, marginBottom: 4 }}
                    />
                    <input
                      value={replyInputs[idx]?.videoUrl || ''}
                      onChange={e => handleReplyChange(idx, 'videoUrl', e.target.value)}
                      placeholder="Reply video URL (optional)"
                      style={{ width: '100%', marginBottom: 4 }}
                    />
                    <button onClick={() => handleReplySubmit(idx)} disabled={replySubmitting[idx]} style={{ marginTop: 2 }}>
                      Save Reply
                    </button>
                    {replyError[idx] && <div style={{ color: 'red' }}>{replyError[idx]}</div>}
                  </div>
                )}
                {/* Show reply if exists */}
                {(r.replyText || r.replyVideoUrl) && (
                  <div style={{ marginTop: 10, marginLeft: 16, background: '#eef6ff', padding: 8, borderRadius: 6, position: 'relative' }}>
                    <div style={{ fontWeight: 500, color: '#225' }}>Reply from profile owner:</div>
                    {r.replyText && <div style={{ marginTop: 2, fontStyle: 'italic', color: '#225' }}>{r.replyText}</div>}
                    {r.replyVideoUrl && (
                      <div style={{ marginTop: 4 }}>
                        <a href={r.replyVideoUrl} target="_blank" rel="noopener noreferrer">Reply Video</a>
                      </div>
                    )}
                    {currentUser && profile && currentUser.uid === userId && (
                      <button onClick={() => handleDeleteReply(idx)} disabled={replySubmitting[idx]} style={{ marginTop: 8, color: '#c00', background: 'none', border: 'none', cursor: 'pointer' }}>
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
      <div style={{ marginTop: 24 }}>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}
