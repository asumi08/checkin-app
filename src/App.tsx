import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Phone, 
  UserPlus, 
  Sparkles, 
  History, 
  Users, 
  Activity, 
  Database, 
  RefreshCw, 
  Search,
  Check,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  lookupCustomer, 
  checkInCustomer, 
  registerAndCheckIn, 
  getDashboardData, 
  formatPhoneDisplay, 
  normalizePhone
} from './services/api';
import type { Customer, CheckInRecord } from './services/api';
import { isSupabaseConfigured } from './lib/supabase';

export function App() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{
    customer: Customer;
    isNew: boolean;
    timestamp: string;
  } | null>(null);

  // New Member Modal state (Bonus requirement)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');

  // Dashboard Stats & Logs state
  const [totalCheckIns, setTotalCheckIns] = useState<number>(0);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [recentLogs, setRecentLogs] = useState<CheckInRecord[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [counterBouncing, setCounterBouncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial stats & data on load
  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await getDashboardData();
      setTotalCheckIns(data.totalCheckIns);
      setTotalMembers(data.totalMembers);
      setRecentLogs(data.recentCheckIns);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, []);

  // Trigger celebration particle effect when checked in
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#3b82f6', '#10b981', '#06b6d4', '#6366f1']
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Main Form Check-In Submission
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return;

    setLoading(true);
    setLastCheckIn(null);

    try {
      // Step 1: Lookup member in database
      const existingCustomer = await lookupCustomer(cleanPhone);

      if (existingCustomer) {
        // Step 2A: Existing Member -> Perform Check-In
        const res = await checkInCustomer(existingCustomer);
        setLastCheckIn({
          customer: res.customer,
          isNew: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setTotalCheckIns(res.totalSystemCheckIns);
        triggerConfetti();
        triggerCounterBounce();
        await loadData();
        setPhone('');
      } else {
        // Step 2B: Member Not Found -> Trigger Bonus Modal
        setPendingPhone(cleanPhone);
        setNewMemberName('');
        setShowRegisterModal(true);
        setTimeout(() => modalInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error('Check in processing error:', err);
      alert('An error occurred while checking in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle New Member Registration & Check-In
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !pendingPhone) return;

    setLoading(true);
    try {
      const res = await registerAndCheckIn(pendingPhone, newMemberName);
      setLastCheckIn({
        customer: res.customer,
        isNew: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setTotalCheckIns(res.totalSystemCheckIns);
      setShowRegisterModal(false);
      triggerConfetti();
      triggerCounterBounce();
      await loadData();
      setPhone('');
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Failed to register member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerCounterBounce = () => {
    setCounterBouncing(true);
    setTimeout(() => setCounterBouncing(false), 500);
  };

  // Handle Preset Click for Demo Testing
  const handlePresetSelect = (presetPhone: string) => {
    setPhone(presetPhone);
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  };

  const filteredLogs = recentLogs.filter(log => 
    log.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    log.phone.includes(searchFilter)
  );

  return (
    <div className="app-container">
      {/* Top Header Navigation */}
      <header className="header-bar">
        <div className="brand-logo">
          <div className="brand-icon">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="brand-title">QuickCheck</h1>
            <p className="brand-subtitle">Smart Phone Check-In System</p>
          </div>
        </div>

        <div className="backend-badge">
          <span className="status-dot" />
          <Database size={14} />
          <span>{isSupabaseConfigured ? 'Supabase Database' : 'Cloud DB Connected'}</span>
        </div>
      </header>

      {/* Main Two-Column Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: Check-In Form & Status */}
        <div className="dashboard-col">
          <div className="glass-card">
            <div className="card-header">
              <h2 className="card-title">
                <Phone size={20} className="text-accent-blue" />
                Member Check-In
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enter registered number</span>
            </div>

            <form onSubmit={handleCheckIn}>
              <div className="form-group">
                <label className="form-label" htmlFor="phone-input-field">
                  Phone Number
                </label>
                <div className="input-wrapper">
                  <input
                    id="phone-input-field"
                    ref={phoneInputRef}
                    type="tel"
                    className="phone-input"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Phone size={18} className="input-icon" />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading || !phone.trim()}
                id="check-in-submit-button"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Tap to Check In</span>
                  </>
                )}
              </button>
            </form>

            {/* Presets for Quick Testing */}
            <div className="preset-section">
              <div className="preset-title">Quick Test Presets:</div>
              <div className="preset-pills">
                <button 
                  type="button"
                  className="preset-chip" 
                  onClick={() => handlePresetSelect('5550101')}
                >
                  555-0101 (Alex)
                </button>
                <button 
                  type="button"
                  className="preset-chip" 
                  onClick={() => handlePresetSelect('5550102')}
                >
                  555-0102 (Jordan)
                </button>
                <button 
                  type="button"
                  className="preset-chip" 
                  onClick={() => handlePresetSelect('5550103')}
                >
                  555-0103 (Taylor)
                </button>
                <button 
                  type="button"
                  className="preset-chip" 
                  onClick={() => handlePresetSelect('5550199')}
                >
                  555-0199 (New User)
                </button>
              </div>
            </div>

            {/* Check-In Success Banner (Requirement 1 & 2) */}
            {lastCheckIn && (
              <div className="success-banner" id="check-in-success-banner">
                <div className="success-header">
                  <div className="check-icon-circle">
                    <CheckCircle2 size={26} />
                  </div>
                  <div>
                    <div className="checked-in-label">
                      {lastCheckIn.isNew ? '🎉 New Member Registered!' : '✓ Check-In Successful'}
                    </div>
                    <div className="member-name">
                      Checked in: {lastCheckIn.customer.name}
                    </div>
                  </div>
                </div>

                <div className="checkin-meta-grid">
                  <div className="meta-box">
                    <div className="meta-key">Total Check-Ins</div>
                    <div className="meta-val">#{lastCheckIn.customer.check_in_count} Lifetime</div>
                  </div>
                  <div className="meta-box">
                    <div className="meta-key">Checked-In At</div>
                    <div className="meta-val">{lastCheckIn.timestamp}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Stats & Activity Feed */}
        <div className="dashboard-col">
          
          {/* Running Count Stat Box (Requirement 1) */}
          <div className="stat-display">
            <div className="stat-info">
              <span className="stat-title">Total Check-Ins</span>
              <span className={`stat-number ${counterBouncing ? 'bounce' : ''}`} id="running-counter">
                {totalCheckIns}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-badge" style={{ marginBottom: '0.4rem' }}>
                <Activity size={14} style={{ display: 'inline', marginRight: '6px' }} />
                System Active
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {totalMembers} Total Members
              </div>
            </div>
          </div>

          {/* Activity Logs Card */}
          <div className="glass-card">
            <div className="card-header">
              <h2 className="card-title">
                <History size={20} className="text-accent-emerald" />
                Recent Activity
              </h2>

              <button 
                className="preset-chip" 
                onClick={loadData}
                disabled={refreshing}
                title="Refresh logs"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} className={refreshing ? 'spinner' : ''} />
                Refresh
              </button>
            </div>

            {/* Filter Input */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="phone-input"
                  style={{ paddingLeft: '2.4rem', fontSize: '0.88rem', padding: '0.6rem 0.8rem 0.6rem 2.4rem' }}
                  placeholder="Filter by name or phone..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
                <Search size={14} className="input-icon" style={{ left: '0.8rem' }} />
              </div>
            </div>

            {/* Activity Stream List */}
            <div className="feed-list">
              {filteredLogs.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No check-in history found. Perform a check-in to see activity.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="feed-item">
                    <div className="feed-user-info">
                      <div className="avatar-circle">
                        {log.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="feed-name">{log.name}</div>
                        <div className="feed-phone">{formatPhoneDisplay(log.phone)}</div>
                      </div>
                    </div>

                    <div className="feed-meta">
                      <div className="feed-badge">Check-in #{log.check_in_number}</div>
                      <div className="feed-time">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bonus Requirement 3: New Member Prompt Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-amber)', marginBottom: '0.4rem' }}>
                <UserPlus size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Phone Not Found</span>
              </div>
              <h3 className="modal-title">Register New Member</h3>
              <p className="modal-desc">
                Number <strong>{formatPhoneDisplay(pendingPhone)}</strong> is not registered. Enter member name to add & check in:
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-member-name-input">
                  Full Name
                </label>
                <div className="input-wrapper">
                  <input
                    id="new-member-name-input"
                    ref={modalInputRef}
                    type="text"
                    className="phone-input"
                    placeholder="e.g. Jane Doe"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Users size={16} className="input-icon" />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !newMemberName.trim()}
                  id="register-and-check-in-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Add & Check In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
