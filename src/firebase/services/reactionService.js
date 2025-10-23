import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, arrayRemove, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config';

// Add or remove a reaction to a message
export const toggleMessageReaction = async (messageId, userId, reaction) => {
  try {
    const reactionRef = doc(db, 'globalChat', messageId, 'reactions', userId);
    const messageRef = doc(db, 'globalChat', messageId);
    const reactionDoc = await getDoc(reactionRef);
    
    if (reactionDoc.exists()) {
      const currentReaction = reactionDoc.data().reaction;
      if (currentReaction === reaction) {
        // Remove reaction if same reaction is clicked
        await setDoc(reactionRef, { reaction: null }, { merge: true });
        await updateDoc(messageRef, {
          [`reactions.${reaction}`]: increment(-1)
        });
      } else {
        // Update to new reaction
        await setDoc(reactionRef, { reaction }, { merge: true });
        if (currentReaction) {
          await updateDoc(messageRef, {
            [`reactions.${currentReaction}`]: increment(-1),
            [`reactions.${reaction}`]: increment(1)
          });
        } else {
          await updateDoc(messageRef, {
            [`reactions.${reaction}`]: increment(1)
          });
        }
      }
    } else {
      // Add new reaction
      await setDoc(reactionRef, { reaction }, { merge: true });
      await updateDoc(messageRef, {
        [`reactions.${reaction}`]: increment(1)
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return { success: false, error: error.message };
  }
};

// Get reactions for a message
export const getMessageReactions = (messageId, callback) => {
  const reactionRef = doc(db, 'globalChat', messageId);
  
  return onSnapshot(reactionRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        reactions: data.reactions || {},
        userReaction: null // We'll get this separately
      });
    } else {
      callback({
        reactions: {},
        userReaction: null
      });
    }
  });
};

// Get user's reaction for a specific message
export const getUserReaction = async (messageId, userId) => {
  try {
    const reactionRef = doc(db, 'globalChat', messageId, 'reactions', userId);
    const reactionDoc = await getDoc(reactionRef);
    
    if (reactionDoc.exists()) {
      return reactionDoc.data().reaction;
    }
    return null;
  } catch (error) {
    console.error('Error getting user reaction:', error);
    return null;
  }
};

// Available reaction emojis
export const REACTION_EMOJIS = {
  heart: '❤️',
  laugh: '😂',
  sad: '😢',
  angry: '😠',
  like: '👍',
  love: '😍'
};

// Available reaction options for UI
export const REACTION_OPTIONS = [
  { key: 'heart', emoji: '❤️', label: 'Love' },
  { key: 'laugh', emoji: '😂', label: 'Haha' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'love', emoji: '😍', label: 'Love' }
];
