/**
 * Banking Service for Emprise Finance
 * Handles Accounts, Transfers (atomic Firestore runTransaction), Ledgers, and Directory Lookups.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  increment,
  Firestore,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, isMockEnabled } from './firebase';
import { mockStorage } from './mockStorage';
import {
  BankAccount,
  AccountDirectoryEntry,
  TransactionRecord,
  UserProfile,
  SignUpFormData,
  AccountType,
} from '../types';
import { generateAccountNumber } from '../utils/format';
import { hashPin } from '../utils/pin';

/**
 * Generates a verified unique 10-digit account number by checking accountDirectory first
 */
export async function getUniqueAccountNumber(activeDb: Firestore): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateAccountNumber();
    const dirDocRef = doc(activeDb, 'accountDirectory', candidate);
    const snap = await getDoc(dirDocRef);
    if (!snap.exists()) {
      return candidate;
    }
  }
  // High-entropy fallback if collisions occur
  return `48${Date.now().toString().slice(-8)}`;
}

/**
 * Fallback unique account number check for dev mock storage
 */
export function getUniqueAccountNumberMock(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateAccountNumber();
    if (!mockStorage.lookupDirectory(candidate)) {
      return candidate;
    }
  }
  return `48${Date.now().toString().slice(-8)}`;
}

/**
 * Creates user, account, directory records, and opening transaction in Firestore after registration
 * using a SINGLE writeBatch.
 */
export async function createNewCustomerAccount(
  uid: string,
  formData: SignUpFormData
): Promise<{ user: UserProfile; account: BankAccount }> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      return mockStorage.createUser(formData);
    }
    throw new Error('Firebase is not configured. Live registration is disabled.');
  }

  const cleanUsername = formData.username.trim().toLowerCase();
  // 1. Ensure unique account number by checking accountDirectory first
  const accountNumber = await getUniqueAccountNumber(activeDb);
  const accountId = `acct_${uid}`;

  const userDoc: UserProfile = {
    uid,
    name: `${formData.firstName} ${formData.lastName}`.trim(),
    username: cleanUsername,
    email: formData.contactEmail.trim(),
    dob: formData.dob,
    phone: formData.phone,
    address: {
      street: formData.street,
      apt: formData.apt || '',
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
    },
    role: 'customer',
    status: 'active',
    createdAt: serverTimestamp(),
  };

  const txRef = doc(collection(activeDb, 'transactions'));
  const accountDoc: BankAccount = {
    id: accountId,
    ownerUid: uid,
    accountNumber,
    type: formData.accountType || 'Checking',
    balanceCents: 0,
    status: 'active',
    createdAt: serverTimestamp(),
    lastTransactionId: txRef.id,
  };

  const directoryDoc: AccountDirectoryEntry = {
    accountNumber,
    accountId,
    ownerName: userDoc.name,
    ownerUid: uid,
    status: 'active',
  };

  const openingTxDoc: Omit<TransactionRecord, 'id'> = {
    accountId,
    ownerUid: uid,
    type: 'credit',
    amountCents: 0,
    counterpartyName: 'Institutional Ledger Enrollment',
    counterpartyAccount: 'ACCOUNT-OPEN',
    note: 'Account opened with zero balance',
    balanceAfterCents: 0,
    status: 'cleared',
    createdAt: serverTimestamp(),
  };

  // 2. Write users/{uid}, accounts/{accountId}, accountDirectory/{accountNumber},
  // and opening transaction with a single writeBatch
  const batch = writeBatch(activeDb);
  batch.set(doc(activeDb, 'users', uid), userDoc);
  batch.set(doc(activeDb, 'accounts', accountId), accountDoc);
  batch.set(doc(activeDb, 'accountDirectory', accountNumber), directoryDoc);
  batch.set(txRef, openingTxDoc);
  await batch.commit();

  return { user: userDoc, account: accountDoc };
}

/**
 * Admin: Create a customer account, directory entry, and opening transaction using a SINGLE writeBatch
 */
export async function adminCreateCustomerAccount(params: {
  uid: string;
  name: string;
  username: string;
  email: string;
  dob: string;
  accountType: AccountType;
  openingCents: number;
}): Promise<{ user: UserProfile; account: BankAccount; accountNumber: string }> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      const res = mockStorage.adminCreateUser({
        name: params.name,
        username: params.username,
        email: params.email,
        dob: params.dob,
        accountType: params.accountType,
        openingBalanceCents: params.openingCents,
      });
      return { user: res.user, account: res.account, accountNumber: res.account.accountNumber };
    }
    throw new Error('Firebase is not configured. Live admin creation is disabled.');
  }

  const { uid, name, username, email, dob, accountType, openingCents } = params;
  const cleanUsername = username.trim().toLowerCase();

  // 1. Ensure unique account number by checking directory first
  const accountNumber = await getUniqueAccountNumber(activeDb);
  const accountId = `acct_${uid}`;

  const txRef = doc(collection(activeDb, 'transactions'));

  const userDoc: UserProfile = {
    uid,
    name: name.trim(),
    username: cleanUsername,
    email: email.trim(),
    dob,
    phone: '(555) 010-0000',
    address: { street: '120 Financial Plaza', city: 'Chicago', state: 'IL', zip: '60601' },
    role: 'customer',
    status: 'active',
    createdAt: serverTimestamp(),
  };

  const accountDoc: BankAccount = {
    id: accountId,
    ownerUid: uid,
    accountNumber,
    type: accountType,
    balanceCents: openingCents,
    status: 'active',
    createdAt: serverTimestamp(),
    lastTransactionId: txRef.id,
  };

  const directoryDoc: AccountDirectoryEntry = {
    accountNumber,
    accountId,
    ownerName: userDoc.name,
    ownerUid: uid,
    status: 'active',
  };

  const openingTxDoc: Omit<TransactionRecord, 'id'> = {
    accountId,
    ownerUid: uid,
    type: 'credit',
    amountCents: openingCents,
    counterpartyName: 'Institutional Opening Deposit',
    counterpartyAccount: 'LEDGER-START',
    note: openingCents > 0 ? 'Initial account opening funding' : 'Account opened',
    balanceAfterCents: openingCents,
    status: 'cleared',
    createdAt: serverTimestamp(),
  };

  // 2. Commit all 4 documents in a SINGLE writeBatch
  const batch = writeBatch(activeDb);
  batch.set(doc(activeDb, 'users', uid), userDoc);
  batch.set(doc(activeDb, 'accounts', accountId), accountDoc);
  batch.set(doc(activeDb, 'accountDirectory', accountNumber), directoryDoc);
  batch.set(txRef, openingTxDoc);
  await batch.commit();

  return { user: userDoc, account: accountDoc, accountNumber };
}

/**
 * Look up a recipient in accountDirectory by account number
 */
export async function lookupAccountDirectory(
  accountNumber: string
): Promise<AccountDirectoryEntry | null> {
  const clean = accountNumber.trim();
  if (!clean) return null;

  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    return isMockEnabled ? mockStorage.lookupDirectory(clean) : null;
  }

  try {
    const dirDoc = await getDoc(doc(activeDb, 'accountDirectory', clean));
    if (!dirDoc.exists()) return null;
    return dirDoc.data() as AccountDirectoryEntry;
  } catch (err) {
    console.error('Error looking up account directory:', err);
    return null;
  }
}

/**
 * Fetches user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    return isMockEnabled ? mockStorage.getUserByUid(uid) : null;
  }

  try {
    const uDoc = await getDoc(doc(activeDb, 'users', uid));
    if (!uDoc.exists()) return null;
    return uDoc.data() as UserProfile;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

/**
 * Fetches bank account by owner UID
 */
export async function getAccountByOwner(uid: string): Promise<BankAccount | null> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    return isMockEnabled ? mockStorage.getAccountByOwner(uid) : null;
  }

  try {
    const q = query(collection(activeDb, 'accounts'), where('ownerUid', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const first = snap.docs[0];
    return { id: first.id, ...first.data() } as BankAccount;
  } catch (err) {
    console.error('Error fetching account:', err);
    return null;
  }
}

/**
 * Real-time listener for customer bank account
 */
export function listenToAccount(
  accountId: string,
  onUpdate: (account: BankAccount | null) => void
): () => void {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      const acct = mockStorage.getAccountById(accountId);
      onUpdate(acct);
      const handler = () => {
        onUpdate(mockStorage.getAccountById(accountId));
      };
      window.addEventListener('emprise_storage_updated', handler);
      return () => window.removeEventListener('emprise_storage_updated', handler);
    }
    onUpdate(null);
    return () => {};
  }

  const unsubscribe = onSnapshot(
    doc(activeDb, 'accounts', accountId),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as BankAccount);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Account listener error:', err);
    }
  );

  return unsubscribe;
}

/**
 * Real-time listener for account transactions ledger
 */
export function listenToTransactions(
  accountId: string,
  onUpdate: (transactions: TransactionRecord[]) => void
): () => void {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      onUpdate(mockStorage.getTransactionsForAccount(accountId));
      const handler = () => {
        onUpdate(mockStorage.getTransactionsForAccount(accountId));
      };
      window.addEventListener('emprise_storage_updated', handler);
      return () => window.removeEventListener('emprise_storage_updated', handler);
    }
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(activeDb, 'transactions'),
    where('accountId', '==', accountId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const list: TransactionRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TransactionRecord[];
      onUpdate(list);
    },
    (err) => {
      console.error('Transactions query listener error:', err);
    }
  );

  return unsubscribe;
}

/**
 * Verifies a 4-digit transfer PIN by writing to the Firestore `pinChecks` collection.
 * If this throws a Firestore 'permission-denied' error, throws an Error with code 'WRONG_PIN'.
 * If it throws a network-type error (unavailable, deadline-exceeded), throws code 'NETWORK'.
 * In mock mode, verifies against the mock-stored hash and throws 'WRONG_PIN' on mismatch.
 */
export async function verifyTransferPin(pin: string, uid: string): Promise<void> {
  const hash = await hashPin(pin, uid);

  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      const storedHash = mockStorage.getPinHash(uid);
      if (!storedHash || storedHash !== hash) {
        const err: any = new Error('Incorrect PIN.');
        err.code = 'WRONG_PIN';
        throw err;
      }
      return;
    }
    throw new Error('Firebase is not configured.');
  }

  try {
    await addDoc(collection(activeDb, 'pinChecks'), { uid, hash });
  } catch (err: any) {
    const errCode = (err?.code || '').toLowerCase();
    const errMsg = (err?.message || '').toLowerCase();

    if (err?.code === 'permission-denied' || errCode === 'permission-denied') {
      const pinErr: any = new Error('Incorrect PIN.');
      pinErr.code = 'WRONG_PIN';
      throw pinErr;
    }

    if (
      errCode === 'unavailable' ||
      errCode === 'deadline-exceeded' ||
      errCode === 'auth/network-request-failed' ||
      errMsg.includes('unavailable') ||
      errMsg.includes('deadline-exceeded') ||
      errMsg.includes('offline') ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      const netErr: any = new Error('Network problem. Check your network connection and try again.');
      netErr.code = 'NETWORK';
      throw netErr;
    }

    throw err;
  }
}

/**
 * Executes an atomic transfer using Firestore runTransaction with PIN verification proof.
 * All document reads (dirSnap, senderSnap, senderUserSnap) execute strictly before any updates or sets.
 * Crucially, recipient's account doc is NOT read (avoiding permission-denied under owner-read security rules)
 * and recipient's balance is updated via increment(amountCents).
 */
export async function executeTransferTransaction(params: {
  senderAccountId: string;
  senderUid: string;
  recipientAccountNumber: string;
  amountCents: number;
  note: string;
  pin: string;
}): Promise<{ senderNewBalanceCents: number; recipientName: string }> {
  const { senderAccountId, senderUid, recipientAccountNumber, amountCents, note, pin } = params;

  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      const result = await mockStorage.executeTransfer(params);
      window.dispatchEvent(new Event('emprise_storage_updated'));
      return result;
    }
    throw new Error('Firebase is not configured. Transfers require an active connection.');
  }

  const cleanRecipientAcct = recipientAccountNumber.trim();
  const pinHash = await hashPin(pin, senderUid);

  try {
    return await runTransaction(activeDb, async (transaction) => {
      // -------------------------------------------------------------
      // PHASE 1: ALL READS (Must execute before any update/set)
      // -------------------------------------------------------------
      // 1. Read recipient directory entry
      const dirRef = doc(activeDb, 'accountDirectory', cleanRecipientAcct);
      const dirSnap = await transaction.get(dirRef);

      if (!dirSnap.exists()) {
        throw new Error('Recipient account number could not be found.');
      }

      const dirData = dirSnap.data() as AccountDirectoryEntry;
      if (dirData.status !== 'active') {
        throw new Error('Recipient account is currently disabled or closed.');
      }

      // 2. Read sender account (Only owner can read this account)
      const senderRef = doc(activeDb, 'accounts', senderAccountId);
      const senderSnap = await transaction.get(senderRef);

      if (!senderSnap.exists()) {
        throw new Error('Sender account not found.');
      }

      const senderData = senderSnap.data() as BankAccount;
      if (senderData.ownerUid !== senderUid) {
        throw new Error('Unauthorized transfer request.');
      }
      if (senderData.status !== 'active') {
        throw new Error('Your account is currently inactive.');
      }
      if (senderData.accountNumber === cleanRecipientAcct) {
        throw new Error('Self-transfer is not permitted.');
      }

      if (senderData.balanceCents < amountCents) {
        throw new Error(
          `Insufficient funds. Your available balance is $${(senderData.balanceCents / 100).toFixed(2)}.`
        );
      }

      // 3. Read sender user doc (BEFORE any writes) to resolve counterparty name
      const senderUserRef = doc(activeDb, 'users', senderUid);
      const senderUserSnap = await transaction.get(senderUserRef);
      const senderName = senderUserSnap.exists()
        ? (senderUserSnap.data() as UserProfile).name
        : 'Emprise Member';

      // NOTE: We do NOT read recipient's account doc.
      // Under Firestore security rules, customers can only read their own account doc.
      // Recipient's balance is incremented atomically in Phase 3.

      // -------------------------------------------------------------
      // PHASE 2: CALCULATIONS & REFERENCES
      // -------------------------------------------------------------
      const senderNewBalanceCents = senderData.balanceCents - amountCents;

      const senderTxRef = doc(collection(activeDb, 'transactions'));
      const recipientTxRef = doc(collection(activeDb, 'transactions'));
      const pinProofRef = doc(activeDb, 'pinProofs', senderTxRef.id);
      const recipientAccountRef = doc(activeDb, 'accounts', dirData.accountId);

      // Debit transaction for sender
      const senderTx: TransactionRecord = {
        id: senderTxRef.id,
        accountId: senderData.id,
        ownerUid: senderData.ownerUid,
        type: 'debit',
        amountCents,
        counterpartyName: dirData.ownerName,
        counterpartyAccount: cleanRecipientAcct,
        note: note.trim() || 'Direct Account Transfer',
        balanceAfterCents: senderNewBalanceCents,
        linkedTransactionId: recipientTxRef.id,
        status: 'cleared',
        createdAt: serverTimestamp(),
      };

      // Credit transaction for recipient (balanceAfterCents is omitted because recipient balance is not read)
      const recipientTx: Omit<TransactionRecord, 'balanceAfterCents'> = {
        id: recipientTxRef.id,
        accountId: dirData.accountId,
        ownerUid: dirData.ownerUid,
        type: 'credit',
        amountCents,
        counterpartyName: senderName,
        counterpartyAccount: senderData.accountNumber,
        note: note.trim() || 'Incoming Transfer',
        linkedTransactionId: senderTxRef.id,
        status: 'cleared',
        createdAt: serverTimestamp(),
      };

      // -------------------------------------------------------------
      // PHASE 3: ALL WRITES
      // -------------------------------------------------------------
      // 1. Update sender account with new balance and link to debit transaction ID
      transaction.update(senderRef, {
        balanceCents: senderNewBalanceCents,
        lastTransactionId: senderTxRef.id,
      });

      // 2. Increment recipient account balance atomically and link to credit transaction ID
      transaction.update(recipientAccountRef, {
        balanceCents: increment(amountCents),
        lastTransactionId: recipientTxRef.id,
      });

      // 3. Commit transactions
      transaction.set(senderTxRef, senderTx);
      transaction.set(recipientTxRef, recipientTx);

      // 4. Commit PIN Proof linking senderUid, hash, and senderTxRef.id
      transaction.set(pinProofRef, {
        uid: senderUid,
        hash: pinHash,
        createdAt: serverTimestamp(),
      });

      return {
        senderNewBalanceCents,
        recipientName: dirData.ownerName,
      };
    });
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      const permError: any = new Error('Transfer could not be completed. Please try again or contact support.');
      permError.code = 'TRANSFER_PERMISSION';
      throw permError;
    }
    throw err;
  }
}

/**
 * Admin: Update customer status ("active" | "disabled" | "closed")
 */
export async function updateCustomerStatus(
  uid: string,
  newStatus: 'active' | 'disabled' | 'closed'
): Promise<void> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      mockStorage.setUserStatus(uid, newStatus);
      window.dispatchEvent(new Event('emprise_storage_updated'));
      return;
    }
    throw new Error('Firebase is not configured.');
  }

  // Find account
  const q = query(collection(activeDb, 'accounts'), where('ownerUid', '==', uid));
  const snap = await getDocs(q);

  await setDoc(doc(activeDb, 'users', uid), { status: newStatus }, { merge: true });

  if (!snap.empty) {
    const acctDoc = snap.docs[0];
    const acctData = acctDoc.data() as BankAccount;
    await setDoc(doc(activeDb, 'accounts', acctDoc.id), { status: newStatus }, { merge: true });
    await setDoc(doc(activeDb, 'accountDirectory', acctData.accountNumber), { status: newStatus }, { merge: true });
  }
}

/**
 * Admin: Edit balance with required note and write adjustment transaction
 */
export async function editCustomerBalance(
  accountId: string,
  amountCents: number,
  direction: 'add' | 'deduct',
  note: string
): Promise<{ newBalanceCents: number }> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    if (isMockEnabled) {
      const res = mockStorage.adjustBalance(accountId, amountCents, direction, note);
      window.dispatchEvent(new Event('emprise_storage_updated'));
      return res;
    }
    throw new Error('Firebase is not configured.');
  }

  return await runTransaction(activeDb, async (transaction) => {
    const acctRef = doc(activeDb, 'accounts', accountId);
    const snap = await transaction.get(acctRef);

    if (!snap.exists()) throw new Error('Account does not exist');
    const acct = snap.data() as BankAccount;
    if (acct.status !== 'active') throw new Error('Cannot adjust balance on inactive account');

    const delta = direction === 'add' ? amountCents : -amountCents;
    const newBalanceCents = acct.balanceCents + delta;

    if (newBalanceCents < 0) {
      throw new Error('Deduction would result in a negative balance.');
    }

    const txRef = doc(collection(activeDb, 'transactions'));
    const txDoc: Omit<TransactionRecord, 'id'> = {
      accountId: acct.id,
      ownerUid: acct.ownerUid,
      type: 'adjustment',
      amountCents: Math.abs(delta),
      counterpartyName: 'Institutional Audit Adjustment',
      counterpartyAccount: 'LEDGER-ADMIN',
      note: note.trim() || 'Administrative Ledger Balance Adjustment',
      balanceAfterCents: newBalanceCents,
      status: 'cleared',
      createdAt: serverTimestamp(),
    };

    transaction.update(acctRef, {
      balanceCents: newBalanceCents,
      lastTransactionId: txRef.id,
    });
    transaction.set(txRef, txDoc);
    return { newBalanceCents };
  });
}

// Aliases for page compatibility
export const getCustomerAccount = getAccountByOwner;
export const subscribeToAccount = listenToAccount;
export const subscribeToTransactions = listenToTransactions;

