import React, { useState, useEffect, useRef } from 'react';
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
      alert('An error occurred while checking in.');
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
      await loadData();
      setPhone('');
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Failed to register member.');
    } finally {
      setLoading(false);
    }
  };

  // Preset quick select for testing
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
      {/* Monochrome Minimalist Header */}
      <header className="header-bar">
        <div className="brand-logo">
          <div className="brand-mark">✓</div>
          <div>
            <h1 className="brand-title">QuickCheck</h1>
            <p className="brand-subtitle">Phone Check-In Engine</p>
          </div>
        </div>

        <div className="backend-badge">
          <span className="status-dot" />
          <span>{isSupabaseConfigured ? 'SUPABASE' : 'CLOUD DB'}</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: Input Form */}
        <div className="dashboard-col">
          <div className="mono-card">
            <div className="card-header">
              <h2 className="card-title">Check In</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>INPUT</span>
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
                    placeholder="Enter phone number..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-mono"
                disabled={loading || !phone.trim()}
                id="check-in-submit-button"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Processing</span>
                  </>
                ) : (
                  <span>Check In →</span>
                )}
              </button>
            </form>

            {/* Test Presets */}
            <div className="preset-section">
              <div className="preset-title">Presets</div>
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
                  555-0199 (New)
                </button>
              </div>
            </div>

            {/* Success Card Output */}
            {lastCheckIn && (
              <div className="success-banner" id="check-in-success-banner">
                <div className="checked-in-tag">
                  {lastCheckIn.isNew ? 'New Member Registered' : 'Checked In'}
                </div>
                <div className="member-name">
                  Checked in: {lastCheckIn.customer.name}
                </div>

                <div className="checkin-meta-inline">
                  <div>Check-Ins: <strong>#{lastCheckIn.customer.check_in_count}</strong></div>
                  <div>Time: <strong>{lastCheckIn.timestamp}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Counter & Activity */}
        <div className="dashboard-col">
          
          {/* Running Counter Stat */}
          <div className="stat-display">
            <div>
              <div className="stat-title">Running Count</div>
              <div className="stat-number" id="running-counter">
                {totalCheckIns}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalMembers} Members
            </div>
          </div>

          {/* Activity Feed */}
          <div className="mono-card">
            <div className="card-header">
              <h2 className="card-title">Activity Log</h2>
              <button 
                className="preset-chip" 
                onClick={loadData}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Filter Input */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="phone-input"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                placeholder="Filter logs..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            {/* Activity Stream List */}
            <div className="feed-list">
              {filteredLogs.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No activity recorded.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="feed-item">
                    <div>
                      <div className="feed-name">{log.name}</div>
                      <div className="feed-phone">{formatPhoneDisplay(log.phone)}</div>
                    </div>

                    <div>
                      <div className="feed-badge">#{log.check_in_number}</div>
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

      {/* Bonus Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-title">New Member</div>
            <p className="modal-desc">
              Number <strong>{formatPhoneDisplay(pendingPhone)}</strong> is not found. Enter member name to register:
            </p>

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-member-name-input">
                  Full Name
                </label>
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
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-mono"
                  style={{ flex: 1 }}
                  disabled={loading || !newMemberName.trim()}
                  id="register-and-check-in-button"
                >
                  {loading ? 'Saving...' : 'Add & Check In'}
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
