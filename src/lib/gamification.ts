import { doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Awards points to a user and tracks their level progress.
 */
export const awardPoints = async (userId: string, points: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(points)
    });
  } catch (error) {
    console.error("Failed to award points:", error);
  }
};

/**
 * Awards a specific badge to a user if they don't already have it.
 */
export const awardBadge = async (userId: string, badgeId: string) => {
  try {
    const badgeRef = doc(db, 'users', userId, 'badges', badgeId);
    const snap = await getDoc(badgeRef);
    
    if (!snap.exists()) {
      await setDoc(badgeRef, {
        badgeId,
        awardedAt: new Date(),
        type: badgeId
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to award badge:", error);
    return false;
  }
};
