import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FollowUpReminder, FactoryFact, DiscussionSession } from '../types';

/**
 * Reminders Cloud Sync
 */
export async function fetchUserRemindersFromCloud(userId: string): Promise<FollowUpReminder[]> {
  try {
    const collRef = collection(db, 'users', userId, 'reminders');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as FollowUpReminder);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/reminders`);
  }
}

export async function saveReminderToCloud(userId: string, reminder: FollowUpReminder): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'reminders', reminder.id);
    await setDoc(docRef, { ...reminder, userId }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/reminders/${reminder.id}`);
  }
}

export async function deleteReminderFromCloud(userId: string, reminderId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'reminders', reminderId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/reminders/${reminderId}`);
  }
}

/**
 * Factory Facts Memory Cloud Sync
 */
export async function fetchFactoryFactsFromCloud(userId: string): Promise<FactoryFact[]> {
  try {
    const collRef = collection(db, 'users', userId, 'factoryFacts');
    const q = query(collRef, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as FactoryFact);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/factoryFacts`);
  }
}

export async function saveFactoryFactToCloud(userId: string, fact: FactoryFact): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'factoryFacts', fact.id);
    await setDoc(docRef, { ...fact, userId }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/factoryFacts/${fact.id}`);
  }
}

export async function deleteFactoryFactFromCloud(userId: string, factId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'factoryFacts', factId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/factoryFacts/${factId}`);
  }
}

/**
 * Discussion Sessions Cloud Sync
 */
export async function archiveSessionToCloud(userId: string, session: DiscussionSession): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'discussions', session.id);
    await setDoc(docRef, { ...session, userId });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/discussions/${session.id}`);
  }
}

export async function fetchSessionsFromCloud(userId: string): Promise<DiscussionSession[]> {
  try {
    const collRef = collection(db, 'users', userId, 'discussions');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => docSnap.data() as DiscussionSession);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/discussions`);
  }
}
