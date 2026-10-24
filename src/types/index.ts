export type UserRole = 'admin' | 'customer';
export type UserStatus = 'active' | 'disabled' | 'closed';
export type AccountType = 'Checking' | 'Savings';
export type TransactionType = 'credit' | 'debit' | 'adjustment';
export type TransactionStatus = 'cleared' | 'pending';

export interface UserAddress {
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string; // Contact email
  dob: string;
  phone: string;
  address: UserAddress;
  role: UserRole;
  status: UserStatus;
  hasPin?: boolean;
  routingNumber?: string;
  photoDataUrl?: string;
  createdAt: any;
}

export interface BankAccount {
  id: string;
  ownerUid: string;
  accountNumber: string; // 10-digit unique
  type: AccountType;
  balanceCents: number; // Integer cents (e.g. 1485075 = $14,850.75)
  status: UserStatus;
  createdAt: any;
  lastTransactionId?: string;
}

export interface AccountDirectoryEntry {
  accountNumber: string;
  accountId: string;
  ownerName: string;
  ownerUid: string;
  status: UserStatus;
}

export interface TransactionRecord {
  id: string;
  accountId: string;
  ownerUid: string;
  type: TransactionType;
  amountCents: number;
  counterpartyName: string;
  counterpartyAccount: string;
  note: string;
  balanceAfterCents?: number;
  linkedTransactionId?: string;
  status: TransactionStatus;
  createdAt: any;
}

export interface SignUpFormData {
  // Step 1: Personal Info
  firstName: string;
  lastName: string;
  dob: string;
  isOver18: boolean;
  contactEmail: string;
  phone: string;
  
  // Step 2: Address & ID
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  govId: string; // accepted, NEVER stored

  // Step 3: Account Setup
  username: string;
  password: string;
  accountType: AccountType;
  routingNumber?: string;
}

export interface TransferRequest {
  fromAccountId: string;
  recipientAccountNumber: string;
  amountCents: number;
  note: string;
  pin: string;
}

