import React, { useState } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Compass, 
  Mail, 
  LogOut, 
  Save, 
  Bookmark, 
  ShieldCheck, 
  CheckCircle,
  AlertCircle,
  Sprout,
  GraduationCap,
  Briefcase,
  Shield,
  Users
} from 'lucide-react';
import { supabase, isSupabaseClientConfigured } from '../utils/supabaseClient';
import { INDIAN_STATES } from '../data/indianLocations';

const CITIZEN_ROLES = [
  { id: 'citizen', label: 'नागरिक / Citizen', icon: Users },
  { id: 'farmer', label: 'किसान / Farmer', icon: Sprout },
  { id: 'student', label: 'छात्र / Student', icon: GraduationCap },
  { id: 'official', label: 'अधिकारी / Official', icon: Shield },
  { id: 'professional', label: 'पेशेवर / Professional', icon: Briefcase },
];

export default function ProfileModal({ isOpen, onClose, user, onUpdateProfile, onSignOut, bookmarkCount = 0 }) {
  if (!isOpen || !user) return null;

  const meta = user.user_metadata || {};
  const [fullName, setFullName] = useState(meta.full_name || meta.name || user.email?.split('@')[0] || '');
  const [selectedRole, setSelectedRole] = useState(meta.role || 'citizen');
  const [selectedState, setSelectedState] = useState(meta.state || 'Delhi');
  const [selectedDistrict, setSelectedDistrict] = useState(meta.district || 'New Delhi');
  
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const currentDistricts = INDIAN_STATES.find((s) => s.state === selectedState)?.districts || [];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: '', text: '' });

    const updatedMetadata = {
      ...meta,
      full_name: fullName,
      role: selectedRole,
      state: selectedState,
      district: selectedDistrict,
    };

    try {
      if (isSupabaseClientConfigured() && supabase) {
        const { error } = await supabase.auth.updateUser({
          data: updatedMetadata,
        });

        if (error) throw error;

        // Sync to public.profiles table safely
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            state: selectedState,
            district: selectedDistrict,
            updated_at: new Date().toISOString(),
          });
        } catch (profileErr) {
          console.warn('Profile table sync warning:', profileErr);
        }
      }

      // Update local storage
      const updatedUser = {
        ...user,
        user_metadata: updatedMetadata,
      };
      localStorage.setItem('bharatvani_user', JSON.stringify(updatedUser));
      
      if (onUpdateProfile) onUpdateProfile(updatedUser);

      setStatusMsg({ type: 'success', text: 'प्रोफाइल सफलतापूर्वक अपडेट हुई! Profile updated.' });
      setTimeout(() => {
        setStatusMsg({ type: '', text: '' });
      }, 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseClientConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('bharatvani_user');
    if (onSignOut) onSignOut();
    onClose();
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'IN';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="gov-auth-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tricolor Accent Ribbon */}
        <div className="tricolor-ribbon">
          <div className="tricolor-saffron" />
          <div className="tricolor-white" />
          <div className="tricolor-green" />
        </div>

        {/* Header */}
        <div className="gov-auth-header">
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Citizen Avatar Initials */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gov-navy)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: '900',
              margin: '0 auto 0.75rem auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '2px solid var(--border-color)',
            }}
          >
            {initials}
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
            {fullName || 'सत्यापित नागरिक / Verified Citizen'}
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Mail size={13} />
            <span>{user.email || 'citizen@bharatvani.gov.in'}</span>
          </div>

          {/* Quick Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: '700',
              }}
            >
              <MapPin size={12} /> {selectedState || 'India'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--gov-navy-light)',
                border: '1px solid var(--gov-navy-border)',
                color: 'var(--gov-navy)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: '700',
              }}
            >
              <Bookmark size={12} /> {bookmarkCount} Saved Articles
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="gov-auth-body">
          {/* Status Alerts */}
          {statusMsg.text && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: statusMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${statusMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '1rem',
              }}
            >
              {statusMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Profile Edit Form */}
          <form onSubmit={handleSave}>
            {/* Full Name */}
            <div className="gov-form-group">
              <label className="gov-form-label">
                <span>पूरा नाम / Full Name</span>
              </label>
              <div className="gov-input-wrapper">
                <User size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* Citizen Role */}
            <div className="gov-form-group">
              <label className="gov-form-label">
                <span>नागरिक श्रेणी / Citizen Category</span>
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CITIZEN_ROLES.map((role) => {
                  const Icon = role.icon;
                  const isActive = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`gov-role-pill-btn ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={13} />
                      <span>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* State & District */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
              <div>
                <label className="gov-form-label">
                  <span>राज्य / State</span>
                </label>
                <div className="gov-input-wrapper">
                  <MapPin size={15} color="var(--text-muted)" />
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedDistrict('');
                    }}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="gov-form-label">
                  <span>जिला / District</span>
                </label>
                <div className="gov-input-wrapper">
                  <Compass size={15} color="var(--text-muted)" />
                  <select
                    disabled={!selectedState}
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                  >
                    <option value="">Select District</option>
                    {currentDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '0.5rem',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'सहेज रहे हैं...' : 'बदलाव सहेजें / Save Changes'}</span>
            </button>
          </form>

          {/* Logout Option */}
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.25rem', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.65rem',
                color: '#dc2626',
                borderColor: '#fca5a5',
                background: '#fef2f2',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <LogOut size={16} />
              <span>खाते से बाहर निकलें / Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
