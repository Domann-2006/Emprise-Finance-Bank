/**
 * Mock & Preview Storage Service
 * Provides seed data and full reactive state when Firebase credentials
 * are not provided in .env, enabling immediate testing of all UI flows.
 */

import { UserProfile, BankAccount, AccountDirectoryEntry, TransactionRecord, SignUpFormData } from '../types';
import { generateAccountNumber } from '../utils/format';
import { hashPin } from '../utils/pin';
import { ROUTING_NUMBER } from '../config/brand';

const STORAGE_USERS_KEY = 'emprise_users_v1';
const STORAGE_ACCOUNTS_KEY = 'emprise_accounts_v1';
const STORAGE_DIRECTORY_KEY = 'emprise_account_directory_v1';
const STORAGE_TRANSACTIONS_KEY = 'emprise_transactions_v1';

const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'admin-uid-1',
    name: 'System Administrator',
    username: 'admin',
    email: 'admin@emprisefinance.com',
    dob: '1985-05-15',
    phone: '(800) 555-0123',
    address: { street: '120 Financial Plaza', city: 'Chicago', state: 'IL', zip: '60601' },
    role: 'admin',
    status: 'active',
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    uid: 'user-elena-1',
    name: 'Elena Vance',
    username: 'elena.vance',
    email: 'elena.vance@workplace.co',
    dob: '1994-10-14',
    phone: '(312) 847-1940',
    address: { street: '420 N Michigan Ave', apt: 'Apt 14B', city: 'Chicago', state: 'IL', zip: '60611' },
    role: 'customer',
    status: 'active',
    routingNumber: ROUTING_NUMBER,
    createdAt: new Date('2024-02-15').toISOString(),
  },
  {
    uid: 'user-alex-1',
    name: 'Alex Rivera',
    username: 'alex.rivera',
    email: 'alex.rivera@workplace.co',
    dob: '1992-06-20',
    phone: '(312) 555-0199',
    address: { street: '780 S Wacker Dr', city: 'Chicago', state: 'IL', zip: '60606' },
    role: 'customer',
    status: 'active',
    routingNumber: ROUTING_NUMBER,
    createdAt: new Date('2024-03-01').toISOString(),
  },
  {
    uid: 'user-marcus-1',
    name: 'Marcus Vance',
    username: 'marcus.vance',
    email: 'marcus.vance@corporate.org',
    dob: '1988-12-05',
    phone: '(312) 555-0144',
    address: { street: '100 W Randolph St', city: 'Chicago', state: 'IL', zip: '60601' },
    role: 'customer',
    status: 'active',
    routingNumber: ROUTING_NUMBER,
    createdAt: new Date('2024-03-10').toISOString(),
  },
  {
    uid: 'user-sarah-1',
    name: 'Sarah Jenkins',
    username: 'sarah.jenkins',
    email: 'sarah.jenkins@example.com',
    dob: '1996-03-22',
    phone: '(312) 555-0177',
    address: { street: '222 Lake Shore Dr', city: 'Chicago', state: 'IL', zip: '60611' },
    role: 'customer',
    status: 'disabled', // Disabled account for testing disabled auth guards
    routingNumber: ROUTING_NUMBER,
    createdAt: new Date('2024-04-05').toISOString(),
  },
];

const INITIAL_ACCOUNTS: BankAccount[] = [
  {
    id: 'acct-elena-1',
    ownerUid: 'user-elena-1',
    accountNumber: '4829108421',
    type: 'Checking',
    balanceCents: 1485075, // $14,850.75
    status: 'active',
    createdAt: new Date('2024-02-15').toISOString(),
  },
  {
    id: 'acct-alex-1',
    ownerUid: 'user-alex-1',
    accountNumber: '4829104829',
    type: 'Checking',
    balanceCents: 524000, // $5,240.00
    status: 'active',
    createdAt: new Date('2024-03-01').toISOString(),
  },
  {
    id: 'acct-marcus-1',
    ownerUid: 'user-marcus-1',
    accountNumber: '4829103309',
    type: 'Checking',
    balanceCents: 9421000, // $94,210.00
    status: 'active',
    createdAt: new Date('2024-03-10').toISOString(),
  },
  {
    id: 'acct-sarah-1',
    ownerUid: 'user-sarah-1',
    accountNumber: '4829105512',
    type: 'Savings',
    balanceCents: 342050, // $3,420.50
    status: 'disabled',
    createdAt: new Date('2024-04-05').toISOString(),
  },
];

const STORAGE_PINS_KEY = 'emprise_mock_pins_v1';

const INITIAL_DIRECTORY: Record<string, AccountDirectoryEntry> = {
  '4829108421': { accountNumber: '4829108421', accountId: 'acct-elena-1', ownerName: 'Elena Vance', ownerUid: 'user-elena-1', status: 'active' },
  '4829104829': { accountNumber: '4829104829', accountId: 'acct-alex-1', ownerName: 'Alex Rivera', ownerUid: 'user-alex-1', status: 'active' },
  '4829103309': { accountNumber: '4829103309', accountId: 'acct-marcus-1', ownerName: 'Marcus Vance', ownerUid: 'user-marcus-1', status: 'active' },
  '4829105512': { accountNumber: '4829105512', accountId: 'acct-sarah-1', ownerName: 'Sarah Jenkins', ownerUid: 'user-sarah-1', status: 'disabled' },
};

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-1',
    accountId: 'acct-elena-1',
    ownerUid: 'user-elena-1',
    type: 'credit',
    amountCents: 342000, // +$3,420.00
    counterpartyName: 'Acme Corp Payroll',
    counterpartyAccount: '4800001000',
    note: 'Bi-weekly Direct Deposit',
    balanceAfterCents: 1485075,
    status: 'cleared',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'tx-2',
    accountId: 'acct-elena-1',
    ownerUid: 'user-elena-1',
    type: 'debit',
    amountCents: 14520, // -$145.20
    counterpartyName: 'Whole Foods Market',
    counterpartyAccount: '4800002000',
    note: 'Groceries & Household',
    balanceAfterCents: 1143075,
    status: 'cleared',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'tx-3',
    accountId: 'acct-elena-1',
    ownerUid: 'user-elena-1',
    type: 'debit',
    amountCents: 45000, // -$450.00
    counterpartyName: 'Marcus Vance',
    counterpartyAccount: '4829103309',
    note: 'Dinner & groceries reimbursement',
    balanceAfterCents: 1157595,
    status: 'cleared',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'tx-4',
    accountId: 'acct-elena-1',
    ownerUid: 'user-elena-1',
    type: 'credit',
    amountCents: 200000, // +$2,000.00
    counterpartyName: 'Design Studio Client',
    counterpartyAccount: '4800003000',
    note: 'Freelance Invoice #1042',
    balanceAfterCents: 1202595,
    status: 'cleared',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'tx-5',
    accountId: 'acct-elena-1',
    ownerUid: 'user-elena-1',
    type: 'debit',
    amountCents: 8520, // -$85.20
    counterpartyName: 'Shell Mobility Gasoline',
    counterpartyAccount: '4800004000',
    note: 'Fuel refill',
    balanceAfterCents: 1002595,
    status: 'cleared',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

class MockStorageService {
  private users: UserProfile[] = [];
  private accounts: BankAccount[] = [];
  private directory: Record<string, AccountDirectoryEntry> = {};
  private transactions: TransactionRecord[] = [];
  private pins: Record<string, string> = {}; // uid -> pinHash

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_USERS_KEY);
      this.users = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];

      const storedAccounts = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      this.accounts = storedAccounts ? JSON.parse(storedAccounts) : [...INITIAL_ACCOUNTS];

      const storedDirectory = localStorage.getItem(STORAGE_DIRECTORY_KEY);
      this.directory = storedDirectory ? JSON.parse(storedDirectory) : { ...INITIAL_DIRECTORY };

      const storedTxns = localStorage.getItem(STORAGE_TRANSACTIONS_KEY);
      this.transactions = storedTxns ? JSON.parse(storedTxns) : [...INITIAL_TRANSACTIONS];

      const storedPins = localStorage.getItem(STORAGE_PINS_KEY);
      this.pins = storedPins ? JSON.parse(storedPins) : {};
    } catch {
      this.users = [...INITIAL_USERS];
      this.accounts = [...INITIAL_ACCOUNTS];
      this.directory = { ...INITIAL_DIRECTORY };
      this.transactions = [...INITIAL_TRANSACTIONS];
      this.pins = {};
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(this.accounts));
      localStorage.setItem(STORAGE_DIRECTORY_KEY, JSON.stringify(this.directory));
      localStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(this.transactions));
      localStorage.setItem(STORAGE_PINS_KEY, JSON.stringify(this.pins));
    } catch (e) {
      console.warn('Unable to persist mock state to localStorage:', e);
    }
  }

  setPinHash(uid: string, hash: string) {
    this.pins[uid] = hash;
    const user = this.users.find((u) => u.uid === uid);
    if (user) {
      user.hasPin = true;
    }
    this.saveState();
  }

  getPinHash(uid: string): string | null {
    return this.pins[uid] || null;
  }

  deletePin(uid: string) {
    delete this.pins[uid];
    const user = this.users.find((u) => u.uid === uid);
    if (user) {
      user.hasPin = false;
    }
    this.saveState();
  }

  getUsers(): UserProfile[] {
    return [...this.users];
  }

  getUserByUid(uid: string): UserProfile | null {
    return this.users.find(u => u.uid === uid) || null;
  }

  getUserByUsername(username: string): UserProfile | null {
    const clean = username.trim().toLowerCase();
    return this.users.find(u => u.username.toLowerCase() === clean) || null;
  }

  getAccountByOwner(uid: string): BankAccount | null {
    return this.accounts.find(a => a.ownerUid === uid) || null;
  }

  getAccountById(id: string): BankAccount | null {
    return this.accounts.find(a => a.id === id) || null;
  }

  getAccountByNumber(accountNumber: string): BankAccount | null {
    const clean = accountNumber.trim();
    return this.accounts.find(a => a.accountNumber === clean) || null;
  }

  lookupDirectory(accountNumber: string): AccountDirectoryEntry | null {
    const clean = accountNumber.trim();
    return this.directory[clean] || null;
  }

  getTransactionsForAccount(accountId: string): TransactionRecord[] {
    return this.transactions
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllTransactions(): TransactionRecord[] {
    return [...this.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createUser(formData: SignUpFormData): { user: UserProfile; account: BankAccount } {
    const cleanUsername = formData.username.trim().toLowerCase();
    const existing = this.getUserByUsername(cleanUsername);
    if (existing) {
      throw new Error('Username is already taken. Please choose another username.');
    }

    const uid = 'usr_' + Math.random().toString(36).substring(2, 9);
    const newAccountNumber = generateAccountNumber();
    const accountId = 'acct_' + Math.random().toString(36).substring(2, 9);

    const user: UserProfile = {
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
      routingNumber: formData.routingNumber?.trim() || ROUTING_NUMBER,
      createdAt: new Date().toISOString(),
    };

    const account: BankAccount = {
      id: accountId,
      ownerUid: uid,
      accountNumber: newAccountNumber,
      type: formData.accountType || 'Checking',
      balanceCents: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.users.push(user);
    this.accounts.push(account);
    this.directory[newAccountNumber] = {
      accountNumber: newAccountNumber,
      accountId,
      ownerName: user.name,
      ownerUid: uid,
      status: 'active',
    };

    this.saveState();
    return { user, account };
  }

  adminCreateUser(params: {
    name: string;
    username: string;
    email: string;
    dob: string;
    accountType: 'Checking' | 'Savings';
    openingBalanceCents: number;
    routingNumber?: string;
  }): { user: UserProfile; account: BankAccount } {
    const cleanUsername = params.username.trim().toLowerCase();
    if (this.getUserByUsername(cleanUsername)) {
      throw new Error('Username is already registered.');
    }

    const uid = 'usr_admin_gen_' + Math.random().toString(36).substring(2, 9);
    const newAccountNumber = generateAccountNumber();
    const accountId = 'acct_' + Math.random().toString(36).substring(2, 9);

    const user: UserProfile = {
      uid,
      name: params.name,
      username: cleanUsername,
      email: params.email,
      dob: params.dob,
      phone: '(555) 010-0000',
      address: { street: '120 Main Street', city: 'Chicago', state: 'IL', zip: '60601' },
      role: 'customer',
      status: 'active',
      routingNumber: params.routingNumber?.trim() || ROUTING_NUMBER,
      createdAt: new Date().toISOString(),
    };

    const account: BankAccount = {
      id: accountId,
      ownerUid: uid,
      accountNumber: newAccountNumber,
      type: params.accountType,
      balanceCents: params.openingBalanceCents,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.users.push(user);
    this.accounts.push(account);
    this.directory[newAccountNumber] = {
      accountNumber: newAccountNumber,
      accountId,
      ownerName: user.name,
      ownerUid: uid,
      status: 'active',
    };

    if (params.openingBalanceCents > 0) {
      this.transactions.push({
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        accountId,
        ownerUid: uid,
        type: 'credit',
        amountCents: params.openingBalanceCents,
        counterpartyName: 'Opening Deposit',
        counterpartyAccount: '0000000000',
        note: 'Initial account opening funds',
        balanceAfterCents: params.openingBalanceCents,
        status: 'cleared',
        createdAt: new Date().toISOString(),
      });
    }

    this.saveState();
    return { user, account };
  }

  setUserStatus(uid: string, newStatus: 'active' | 'disabled' | 'closed') {
    const user = this.users.find(u => u.uid === uid);
    if (!user) throw new Error('User not found');
    user.status = newStatus;

    const account = this.accounts.find(a => a.ownerUid === uid);
    if (account) {
      account.status = newStatus;
      if (this.directory[account.accountNumber]) {
        this.directory[account.accountNumber].status = newStatus;
      }
    }

    this.saveState();
  }

  adjustBalance(accountId: string, amountCents: number, type: 'add' | 'deduct', note: string): { newBalanceCents: number } {
    const account = this.accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Account not found');
    if (account.status !== 'active') throw new Error('Cannot adjust balance on inactive or closed account');

    const delta = type === 'add' ? amountCents : -amountCents;
    if (account.balanceCents + delta < 0) {
      throw new Error('Deduction would result in a negative balance.');
    }

    account.balanceCents += delta;

    this.transactions.push({
      id: 'tx_adj_' + Math.random().toString(36).substring(2, 9),
      accountId,
      ownerUid: account.ownerUid,
      type: 'adjustment',
      amountCents: Math.abs(delta),
      counterpartyName: 'Institutional Audit Adjustment',
      counterpartyAccount: 'LEDGER-ADMIN',
      note: note || 'Administrative balance adjustment',
      balanceAfterCents: account.balanceCents,
      status: 'cleared',
      createdAt: new Date().toISOString(),
    });

    this.saveState();
    return { newBalanceCents: account.balanceCents };
  }

  async executeTransfer(params: {
    senderAccountId: string;
    senderUid: string;
    recipientAccountNumber: string;
    amountCents: number;
    note: string;
    pin: string;
  }): Promise<{ senderNewBalanceCents: number; recipientName: string }> {
    const { senderAccountId, senderUid, recipientAccountNumber, amountCents, note, pin } = params;

    if (amountCents <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    // Verify PIN if sender has configured a PIN
    const senderUser = this.users.find(u => u.uid === senderUid);
    const storedHash = this.getPinHash(senderUid);
    if (senderUser?.hasPin && storedHash) {
      const computedHash = await hashPin(pin, senderUid);
      if (storedHash !== computedHash) {
        throw new Error('Incorrect PIN.');
      }
    }

    const senderAccount = this.accounts.find(a => a.id === senderAccountId);
    if (!senderAccount) throw new Error('Sender account not found.');
    if (senderAccount.ownerUid !== senderUid) throw new Error('Unauthorized transfer request.');
    if (senderAccount.status !== 'active') throw new Error('Your account is currently inactive.');

    if (senderAccount.accountNumber === recipientAccountNumber.trim()) {
      throw new Error('Self-transfer is not permitted. Please choose another recipient account.');
    }

    const recipientDir = this.directory[recipientAccountNumber.trim()];
    if (!recipientDir) {
      throw new Error('Recipient account number could not be found.');
    }
    if (recipientDir.status !== 'active') {
      throw new Error('Recipient account is currently disabled or closed.');
    }

    const recipientAccount = this.accounts.find(a => a.id === recipientDir.accountId);
    if (!recipientAccount) throw new Error('Recipient account records missing.');

    if (senderAccount.balanceCents < amountCents) {
      throw new Error(`Insufficient funds. Your available balance is $${(senderAccount.balanceCents / 100).toFixed(2)}.`);
    }

    // Atomic update
    senderAccount.balanceCents -= amountCents;
    recipientAccount.balanceCents += amountCents;

    const senderName = senderUser?.name || 'Emprise Member';
    const now = new Date().toISOString();

    const senderTxId = 'tx_deb_' + Math.random().toString(36).substring(2, 9);
    const recipientTxId = 'tx_crd_' + Math.random().toString(36).substring(2, 9);

    // 1. Debit transaction for sender
    this.transactions.push({
      id: senderTxId,
      accountId: senderAccount.id,
      ownerUid: senderAccount.ownerUid,
      type: 'debit',
      amountCents,
      counterpartyName: recipientDir.ownerName,
      counterpartyAccount: recipientAccount.accountNumber,
      note: note.trim() || 'Direct Account Transfer',
      balanceAfterCents: senderAccount.balanceCents,
      linkedTransactionId: recipientTxId,
      status: 'cleared',
      createdAt: now,
    });

    // 2. Credit transaction for recipient (omit balanceAfterCents per spec)
    this.transactions.push({
      id: recipientTxId,
      accountId: recipientAccount.id,
      ownerUid: recipientAccount.ownerUid,
      type: 'credit',
      amountCents,
      counterpartyName: senderName,
      counterpartyAccount: senderAccount.accountNumber,
      note: note.trim() || 'Incoming Account Transfer',
      linkedTransactionId: senderTxId,
      status: 'cleared',
      createdAt: now,
    });

    this.saveState();
    return {
      senderNewBalanceCents: senderAccount.balanceCents,
      recipientName: recipientDir.ownerName,
    };
  }
}

export const mockStorage = new MockStorageService();
