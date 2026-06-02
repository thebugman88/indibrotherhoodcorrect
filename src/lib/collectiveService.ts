import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface Collective {
  id?: string;
  name: string;
  description: string;
  type: 'label' | 'crew' | 'collective';
  creatorId: string;
  createdAt: any;
  isPrivate: boolean;
  memberCount: number;
}

export interface CollectiveMember {
  uid: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: any;
}

/**
 * Creates a new collective (tenant) and assigns the creator as the owner.
 */
export const createCollective = async (name: string, description: string, type: 'label' | 'crew' | 'collective', isPrivate: boolean = true) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");

  // Use a transaction to ensure both Collective and Member are created atomicly
  return await runTransaction(db, async (transaction) => {
    const collectiveColl = collection(db, 'collectives');
    const newCollectiveRef = doc(collectiveColl); // Pre-generate ID
    
    const collectiveData: Collective = {
      name,
      description,
      type,
      creatorId: user.uid,
      createdAt: serverTimestamp(),
      isPrivate,
      memberCount: 1
    };

    transaction.set(newCollectiveRef, collectiveData);

    const membershipId = `${user.uid}_${newCollectiveRef.id}`;
    const membershipRef = doc(db, 'memberships', membershipId);
    const membershipData = {
      uid: user.uid,
      collectiveId: newCollectiveRef.id,
      role: 'owner' as const,
      joinedAt: serverTimestamp()
    };

    transaction.set(membershipRef, membershipData);

    return newCollectiveRef.id;
  });
};

/**
 * Retrieves all collectives where the current user is a member.
 */
export const getUserCollectives = async (userId: string) => {
  const q = query(collection(db, 'memberships'), where('uid', '==', userId));
  const membershipSnap = await getDocs(q);
  const collectiveIds = membershipSnap.docs.map(d => d.data().collectiveId);
  
  if (collectiveIds.length === 0) return [];

  // Fetch actual collective data
  const colls = [];
  for (const id of collectiveIds) {
    const d = await getDoc(doc(db, 'collectives', id));
    if (d.exists()) colls.push({ id: d.id, ...d.data() });
  }
  return colls;
};

/**
 * Adds a member to a collective with a specific role.
 */
export const addMember = async (collectiveId: string, memberUid: string, role: CollectiveMember['role'] = 'member') => {
  const membershipId = `${memberUid}_${collectiveId}`;
  const membershipRef = doc(db, 'memberships', membershipId);
  await setDoc(membershipRef, {
    uid: memberUid,
    collectiveId,
    role,
    joinedAt: serverTimestamp()
  });

  // Increment member count
  const collectiveRef = doc(db, 'collectives', collectiveId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(collectiveRef);
    if (!snap.exists()) throw new Error("Collective does not exist");
    const newCount = (snap.data().memberCount || 0) + 1;
    transaction.update(collectiveRef, { memberCount: newCount });
  });
};
