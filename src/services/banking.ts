/**
 * Banking Service for Emprise Finance
 * Handles Accounts, Transfers (atomic Firestore runTransaction), Ledgers, and Directory Lookups.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { mockStorage } from './mockStorage';
import {
  BankAccount,
  AccountDirectoryEntry,
  TransactionRecord,
  UserProfile,
  SignUpFormData,
} from '../types';
import { generateAccountNumber } from '../utils/format';

/**
 * Creates user, account and directory records in Firestore after registration
 */
export async function createNewCustomerAccount(
  uid: string,
  formData: SignUpFormData
): Promise<{ user: UserProfile; account: BankAccount }> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    return mockStorage.createUser(formData);
  }

  const cleanUsername = formData.username.trim().toLowerCase();
  const accountNumber = generateAccountNumber();
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

  const accountDoc: BankAccount = {
    id: accountId,
    ownerUid: uid,
    accountNumber,
    type: formData.accountType || 'Checking',
    balanceCents: 0,
    status: 'active',
    createdAt: serverTimestamp(),
  };

  const directoryDoc: AccountDirectoryEntry = {
    accountNumber,
    accountId,
    ownerName: userDoc.name,
    status: 'active',
  };

  // Write users/{uid}, accounts/{accountId}, accountDirectory/{accountNumber}
  await setDoc(doc(activeDb, 'users', uid), userDoc);
  await setDoc(doc(activeDb, 'accounts', accountId), accountDoc);
  await setDoc(doc(activeDb, 'accountDirectory', accountNumber), directoryDoc);

  return { user: userDoc, account: accountDoc };
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
    return mockStorage.lookupDirectory(clean);
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
    return mockStorage.getUserByUid(uid);
  }

  try {
    const snap = await getDoc(doc(activeDb, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

/**
 * Fetches customer account by owner UID
 */
export async function getCustomerAccount(uid: string): Promise<BankAccount | null> {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    return mockStorage.getAccountByOwner(uid);
  }

  try {
    const q = query(collection(activeDb, 'accounts'), where('ownerUid', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0];
    return { id: docData.id, ...docData.data() } as BankAccount;
  } catch (err) {
    console.error('Error fetching customer account:', err);
    return null;
  }
}

/**
 * Subscribes to live account changes (balance, status)
 */
export function subscribeToAccount(
  accountId: string,
  onUpdate: (account: BankAccount) => void
): () => void {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    const poll = () => {
      const acct = mockStorage.getAccountById(accountId);
      if (acct) onUpdate(acct);
    };
    poll();
    window.addEventListener('emprise_storage_updated', poll);
    return () => window.removeEventListener('emprise_storage_updated', poll);
  }

  const unsubscribe = onSnapshot(doc(activeDb, 'accounts', accountId), (snap) => {
    if (snap.exists()) {
      onUpdate({ id: snap.id, ...snap.data() } as BankAccount);
    }
  });

  return unsubscribe;
}

/**
 * Subscribes to live transactions for an account
 */
export function subscribeToTransactions(
  accountId: string,
  onUpdate: (transactions: TransactionRecord[]) => void
): () => void {
  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    const update = () => {
      onUpdate(mockStorage.getTransactionsForAccount(accountId));
    };
    update();
    window.addEventListener('emprise_storage_updated', update);
    return () => window.removeEventListener('emprise_storage_updated', update);
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
 * Executes an atomic transfer using Firestore runTransaction
 */
export async function executeTransferTransaction(params: {
  senderAccountId: string;
  senderUid: string;
  recipientAccountNumber: string;
  amountCents: number;
  note: string;
}): Promise<{ senderNewBalanceCents: number; recipientName: string }> {
  const { senderAccountId, senderUid, recipientAccountNumber, amountCents, note } = params;

  const activeDb = db;
  if (!isFirebaseConfigured() || !activeDb) {
    const result = mockStorage.executeTransfer(params);
    window.dispatchEvent(new Event('emprise_storage_updated'));
    return result;
  }

  const cleanRecipientAcct = recipientAccountNumber.trim();

  return await runTransaction(activeDb, async (transaction) => {
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

    // 2. Read sender account
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

    // 3. Read recipient account
    const recipientRef = doc(activeDb, 'accounts', dirData.accountId);
    const recipientSnap = await transaction.get(recipientRef);

    if (!recipientSnap.exists()) {
      throw new Error('Recipient account details not found.');
    }
    const recipientData = recipientSnap.data() as BankAccount;
    if (recipientData.status !== 'active') {
      throw new Error('Recipient account is currently not active.');
    }

    // 4. Calculate new balances
    const senderNewBalanceCents = senderData.balanceCents - amountCents;
    const recipientNewBalanceCents = recipientData.balanceCents + amountCents;

    // 5. Update balances
    transaction.update(senderRef, { balanceCents: senderNewBalanceCents });
    transaction.update(recipientRef, { balanceCents: recipientNewBalanceCents });

    // Read sender profile for counterparty name
    const senderUserRef = doc(activeDb, 'users', senderUid);
    const senderUserSnap = await transaction.get(senderUserRef);
    const senderName = senderUserSnap.exists()
      ? (senderUserSnap.data() as UserProfile).name
      : 'Emprise Member';

    // 6. Write two transaction documents
    const senderTxRef = doc(collection(activeDb, 'transactions'));
    const recipientTxRef = doc(collection(activeDb, 'transactions'));

    const senderTx: Omit<TransactionRecord, 'id'> = {
      accountId: senderData.id,
      ownerUid: senderData.ownerUid,
      type: 'debit',
      amountCents,
      counterpartyName: dirData.ownerName,
      counterpartyAccount: cleanRecipientAcct,
      note: note.trim() || 'Direct Account Transfer',
      balanceAfterCents: senderNewBalanceCents,
      status: 'cleared',
      createdAt: serverTimestamp(),
    };

    const recipientTx: Omit<TransactionRecord, 'id'> = {
      accountId: recipientData.id,
      ownerUid: recipientData.ownerUid,
      type: 'credit',
      amountCents,
      counterpartyName: senderName,
      counterpartyAccount: senderData.accountNumber,
      note: note.trim() || 'Incoming Transfer',
      balanceAfterCents: recipientNewBalanceCents,
      status: 'cleared',
      createdAt: serverTimestamp(),
    };

    transaction.set(senderTxRef, senderTx);
    transaction.set(recipientTxRef, recipientTx);

    return {
      senderNewBalanceCents,
      recipientName: dirData.ownerName,
    };
  });
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
    mockStorage.setUserStatus(uid, newStatus);
    window.dispatchEvent(new Event('emprise_storage_updated'));
    return;
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
    const res = mockStorage.adjustBalance(accountId, amountCents, direction, note);
    window.dispatchEvent(new Event('emprise_storage_updated'));
    return res;
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

    transaction.update(acctRef, { balanceCents: newBalanceCents });

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

    transaction.set(txRef, txDoc);
    return { newBalanceCents };
  });
}
