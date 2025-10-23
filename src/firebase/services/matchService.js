// Match service for Firebase operations
import { doc, setDoc, collection, query, where, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config';

// Create a match between two users
export const createMatch = async (user1Id, user2Id) => {
  try {
    const matchId = `${user1Id}_${user2Id}`;
    await setDoc(doc(db, 'matches', matchId), {
      user1Id,
      user2Id,
      createdAt: new Date(),
      status: 'active'
    });
    console.log('Match created successfully:', matchId);
    return { success: true, matchId };
  } catch (error) {
    console.error('Error creating match:', error);
    // Don't throw error, just log it and continue
    return { success: false, error };
  }
};

// Get matches for a user (async version)
export const getUserMatches = async (userId) => {
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('user1Id', '==', userId));
    const snapshot = await getDocs(q);
    
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return matches;
  } catch (error) {
    console.error('Error getting user matches:', error);
    return [];
  }
};

// Get matches for a user (realtime version with callback)
export const getUserMatchesRealtime = (userId, callback) => {
  const matchesRef = collection(db, 'matches');
  const q = query(matchesRef, where('user1Id', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (callback && typeof callback === 'function') {
      callback(matches);
    }
  });
};

// Check if two users have matched
export const checkMatch = async (user1Id, user2Id) => {
  try {
    const matchId = `${user1Id}_${user2Id}`;
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    return { success: true, exists: matchDoc.exists() };
  } catch (error) {
    console.error('Error checking match:', error);
    return { success: false, error };
  }
};
