/**
 * Hardware-Protected Cryptographic Vault (IndexedDB + Web Crypto API)
 * Stores PIN hash encrypted with a non-extractable AES-GCM 256-bit key per user.
 * 
 * Never stores raw PINs or raw hashes in localStorage or unencrypted stores.
 */

const DB_NAME = 'emprise-secure';
const DB_VERSION = 1;
const STORE_KEYS = 'keys';
const STORE_VAULT = 'vault';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS);
      }
      if (!db.objectStoreNames.contains(STORE_VAULT)) {
        db.createObjectStore(STORE_VAULT);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFromStore<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putInStore<T>(db: IDBDatabase, storeName: string, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateKey(db: IDBDatabase, uid: string): Promise<CryptoKey> {
  const existingKey = await getFromStore<CryptoKey>(db, STORE_KEYS, uid);
  if (existingKey) {
    return existingKey;
  }

  // Generate a non-extractable AES-GCM 256-bit key
  const newKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // extractable = false (key cannot be exported from CryptoKey object)
    ['encrypt', 'decrypt']
  );

  await putInStore(db, STORE_KEYS, uid, newKey);
  return newKey;
}

export async function storeSecret(uid: string, pinHash: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    const key = await getOrCreateKey(db, uid);

    // 12-byte initialization vector for AES-GCM
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(pinHash);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      plaintext
    );

    await putInStore(db, STORE_VAULT, uid, { iv, ciphertext });
    return true;
  } catch (err) {
    console.error('[vault] storeSecret error:', err);
    return false;
  }
}

export async function readSecret(uid: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    const key = await getFromStore<CryptoKey>(db, STORE_KEYS, uid);
    if (!key) return null;

    const record = await getFromStore<{ iv: Uint8Array; ciphertext: ArrayBuffer }>(db, STORE_VAULT, uid);
    if (!record || !record.iv || !record.ciphertext) return null;

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: record.iv as BufferSource,
      },
      key,
      record.ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error('[vault] readSecret error:', err);
    return null;
  }
}

export async function deleteSecret(uid: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    await Promise.all([
      deleteFromStore(db, STORE_KEYS, uid),
      deleteFromStore(db, STORE_VAULT, uid),
    ]);
    return true;
  } catch (err) {
    console.error('[vault] deleteSecret error:', err);
    return false;
  }
}
