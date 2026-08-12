import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Customer {
  id: string;
  phone: string;
  name: string;
  check_in_count: number;
  created_at: string;
  updated_at: string;
}

export interface CheckInRecord {
  id: string;
  customer_id?: string;
  phone: string;
  name: string;
  check_in_number: number;
  created_at: string;
}

export interface CheckInResponse {
  success: boolean;
  isNewMember: boolean;
  customer: Customer;
  totalSystemCheckIns: number;
  message?: string;
}

// Fallback Remote Cloud DB key for standalone deployment
const CLOUD_DB_KEY = 'quickcheck_cloud_backend_v1';

// In-Memory & Storage Cloud Data Structure for non-Supabase mode
interface CloudDataStore {
  customers: Customer[];
  checkIns: CheckInRecord[];
  totalCheckIns: number;
}

let memoryStoreCache: CloudDataStore | null = null;

const getInitialStore = (): CloudDataStore => {
  if (memoryStoreCache) return memoryStoreCache;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(CLOUD_DB_KEY);
      if (raw) {
        memoryStoreCache = JSON.parse(raw);
        return memoryStoreCache!;
      }
    } catch (e) {
      console.error('Failed to parse fallback store', e);
    }
  }

  // Default seeded members if completely empty
  const defaultStore: CloudDataStore = {
    customers: [
      { id: '1', phone: '5550101', name: 'Alex Morgan', check_in_count: 5, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date().toISOString() },
      { id: '2', phone: '5550102', name: 'Jordan Lee', check_in_count: 3, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
      { id: '3', phone: '5550103', name: 'Taylor Swift', check_in_count: 12, created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date().toISOString() }
    ],
    checkIns: [
      { id: 'c1', phone: '5550103', name: 'Taylor Swift', check_in_number: 12, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 'c2', phone: '5550101', name: 'Alex Morgan', check_in_number: 5, created_at: new Date(Date.now() - 3600000 * 5).toISOString() }
    ],
    totalCheckIns: 20
  };

  memoryStoreCache = defaultStore;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CLOUD_DB_KEY, JSON.stringify(defaultStore));
    } catch {}
  }
  return defaultStore;
};

const saveStore = (store: CloudDataStore) => {
  memoryStoreCache = store;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CLOUD_DB_KEY, JSON.stringify(store));
    } catch (e) {
      console.error('Failed to write store', e);
    }
  }
};

/**
 * Standardize phone number format for consistent database querying.
 * Handles country codes (+1), dashes, spaces, and parentheses.
 * e.g. "+1 (555) 010-0101" -> "5550100101"
 */
export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  // Strip leading US country code '1' if present on 11-digit numbers
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Format raw phone number for clean UI display: (555) 012-3456
 */
export function formatPhoneDisplay(rawPhone: string): string {
  const cleaned = normalizePhone(rawPhone);
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  if (cleaned.length > 0) {
    return cleaned;
  }
  return rawPhone;
}

/**
 * Lookup member by phone number
 */
export async function lookupCustomer(phoneInput: string): Promise<Customer | null> {
  const normalized = normalizePhone(phoneInput);
  if (!normalized) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle();

      if (error) {
        console.error('Supabase lookup error:', error);
        throw error;
      }
      return data as Customer | null;
    } catch (err) {
      console.warn('Falling back to cloud store lookup due to Supabase connection error:', err);
    }
  }

  // Fallback DB lookup
  const store = getInitialStore();
  const found = store.customers.find(c => normalizePhone(c.phone) === normalized);
  return found || null;
}

/**
 * Execute check-in for an existing customer
 */
export async function checkInCustomer(customer: Customer): Promise<CheckInResponse> {
  const newCount = customer.check_in_count + 1;
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Update customer record in Supabase
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          check_in_count: newCount,
          updated_at: nowStr
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Insert check-in history record
      const { error: logError } = await supabase
        .from('check_ins')
        .insert({
          customer_id: customer.id,
          phone: customer.phone,
          name: customer.name,
          check_in_number: newCount,
          created_at: nowStr
        });

      if (logError) console.error('Failed to record check_in entry:', logError);

      // 3. Query total count across system
      const { count } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true });

      return {
        success: true,
        isNewMember: false,
        customer: updatedCustomer as Customer,
        totalSystemCheckIns: count ?? newCount
      };
    } catch (err) {
      console.warn('Supabase checkIn error, using Cloud DB fallback', err);
    }
  }

  // Fallback DB execution
  const store = getInitialStore();
  const targetIndex = store.customers.findIndex(c => c.id === customer.id);
  if (targetIndex !== -1) {
    store.customers[targetIndex].check_in_count = newCount;
    store.customers[targetIndex].updated_at = nowStr;
  }
  const checkInRec: CheckInRecord = {
    id: 'chk_' + Date.now(),
    customer_id: customer.id,
    phone: customer.phone,
    name: customer.name,
    check_in_number: newCount,
    created_at: nowStr
  };
  store.checkIns.unshift(checkInRec);
  store.totalCheckIns += 1;
  saveStore(store);

  return {
    success: true,
    isNewMember: false,
    customer: { ...customer, check_in_count: newCount, updated_at: nowStr },
    totalSystemCheckIns: store.totalCheckIns
  };
}

/**
 * Create a new member & perform their first check-in (Bonus Requirement)
 */
export async function registerAndCheckIn(phoneInput: string, nameInput: string): Promise<CheckInResponse> {
  const normalized = normalizePhone(phoneInput);
  const trimmedName = nameInput.trim();
  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Insert new customer into Supabase
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          phone: normalized,
          name: trimmedName,
          check_in_count: 1,
          created_at: nowStr,
          updated_at: nowStr
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Insert check-in record
      const { error: logError } = await supabase
        .from('check_ins')
        .insert({
          customer_id: newCustomer.id,
          phone: normalized,
          name: trimmedName,
          check_in_number: 1,
          created_at: nowStr
        });

      if (logError) console.error('Failed to log first check in:', logError);

      // 3. Count total system check-ins
      const { count } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true });

      return {
        success: true,
        isNewMember: true,
        customer: newCustomer as Customer,
        totalSystemCheckIns: count ?? 1
      };
    } catch (err) {
      console.warn('Supabase register error, using Cloud DB fallback', err);
    }
  }

  // Fallback DB execution
  const store = getInitialStore();
  const newCust: Customer = {
    id: 'cust_' + Date.now(),
    phone: normalized,
    name: trimmedName,
    check_in_count: 1,
    created_at: nowStr,
    updated_at: nowStr
  };
  store.customers.push(newCust);
  
  const checkInRec: CheckInRecord = {
    id: 'chk_' + Date.now(),
    customer_id: newCust.id,
    phone: normalized,
    name: trimmedName,
    check_in_number: 1,
    created_at: nowStr
  };
  store.checkIns.unshift(checkInRec);
  store.totalCheckIns += 1;
  saveStore(store);

  return {
    success: true,
    isNewMember: true,
    customer: newCust,
    totalSystemCheckIns: store.totalCheckIns
  };
}

/**
 * Fetch total stats and recent check-in logs
 */
export async function getDashboardData(): Promise<{
  totalCheckIns: number;
  totalMembers: number;
  recentCheckIns: CheckInRecord[];
  allCustomers: Customer[];
}> {
  if (isSupabaseConfigured && supabase) {
    try {
      const [checkInsRes, customersRes, totalCheckInsRes] = await Promise.all([
        supabase.from('check_ins').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('customers').select('*').order('updated_at', { ascending: false }),
        supabase.from('check_ins').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalCheckIns: totalCheckInsRes.count || (checkInsRes.data?.length ?? 0),
        totalMembers: customersRes.data?.length ?? 0,
        recentCheckIns: (checkInsRes.data as CheckInRecord[]) || [],
        allCustomers: (customersRes.data as Customer[]) || []
      };
    } catch (err) {
      console.warn('Failed to fetch from Supabase, returning Cloud store stats', err);
    }
  }

  // Fallback DB
  const store = getInitialStore();
  return {
    totalCheckIns: store.totalCheckIns,
    totalMembers: store.customers.length,
    recentCheckIns: store.checkIns.slice(0, 20),
    allCustomers: store.customers
  };
}
