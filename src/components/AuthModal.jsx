import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  Compass, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  LogIn,
  UserPlus,
  ArrowRight,
  Shield,
  Briefcase,
  GraduationCap,
  Sprout,
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

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialTab = 'signup' }) {
  const [tab, setTab] = useState(initialTab); // 'signup' | 'signin'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [selectedState, setSelectedState] = useState('Delhi');
  const [selectedDistrict, setSelectedDistrict] = useState('New Delhi');

  if (!isOpen) return null;

  // Available districts for the selected state
  const currentDistricts = INDIAN_STATES.find((s) => s.state === selectedState)?.districts || [];

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    if (!isSupabaseClientConfigured() || !supabase) {
      // Demo mock fallback if Supabase not configured
      const mockUser = {
        id: 'google_guest_' + Date.now(),
        email: 'citizen@gov.in',
        user_metadata: {
          full_name: 'Verified Citizen',
          role: 'citizen',
          state: 'Delhi',
          district: 'New Delhi',
        },
      };
      localStorage.setItem('bharatvani_user', JSON.stringify(mockUser));
      if (onAuthSuccess) onAuthSuccess(mockUser);
      onClose();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error('Google Sign-in Error:', err);
      setErrorMsg(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Authentication
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please provide both email and password');
      return;
    }

    if (!isSupabaseClientConfigured() || !supabase) {
      // Offline / Local fallback demo
      const mockUser = {
        id: 'guest_' + Date.now(),
        email: email,
        user_metadata: {
          full_name: fullName || email.split('@')[0],
          role: selectedRole,
          state: selectedState || 'Delhi',
          district: selectedDistrict || 'New Delhi',
        },
      };
      localStorage.setItem('bharatvani_user', JSON.stringify(mockUser));
      if (onAuthSuccess) onAuthSuccess(mockUser);
      onClose();
      return;
    }

    setLoading(true);

    try {
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: selectedRole,
              state: selectedState,
              district: selectedDistrict,
            },
          },
        });

        if (error) throw error;

        if (data?.user) {
          // Attempt to sync to public.profiles table safely without breaking auth if table/RLS differs
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: email,
              full_name: fullName,
              state: selectedState,
              district: selectedDistrict,
              updated_at: new Date().toISOString(),
            });
          } catch (profileErr) {
            console.warn('Profile table sync warning:', profileErr);
          }

          // If email confirmation is enabled on Supabase, session might be null
          if (!data.session) {
            setSuccessMsg('खाता बन गया है! कृपया अपने ईमेल पर पुष्टि लिंक देखें (यदि पुष्टि सक्रिय है)। / Account created! If email confirmation is enabled, please verify your email.');
            setTimeout(() => {
              if (onAuthSuccess) onAuthSuccess(data.user);
              onClose();
            }, 2500);
          } else {
            setSuccessMsg('पंजीकरण सफल! Welcome to BharatVani Portal.');
            setTimeout(() => {
              if (onAuthSuccess) onAuthSuccess(data.user);
              onClose();
            }, 1000);
          }
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user) {
          setSuccessMsg('सफलतापूर्वक लॉग इन हुआ! Signed in successfully.');
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(data.user);
            onClose();
          }, 800);
        }
      }
    } catch (err) {
      console.error('Auth Error:', err);
      const msg = err.message || 'प्रमाणीकरण त्रुटि / Authentication failed.';
      if (msg.includes('Email not confirmed')) {
        setErrorMsg('ईमेल की पुष्टि नहीं हुई है। कृपया अपना ईमेल चेक करें या Supabase Dashboard में "Confirm email" बंद करें।');
      } else if (msg.includes('Invalid login credentials')) {
        setErrorMsg('गलत ईमेल या पासवर्ड / Invalid email or password.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

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

        {/* Official Header */}
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

          {/* Official Seal & Title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🇮🇳</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                भारत सरकार • Govt. of India
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                भारतवाणी नागरिक सेवा पोर्टल
              </h2>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginTop: '0.2rem',
          }}>
            <ShieldCheck size={13} color="#15803d" />
            <span>PIB Press Releases • 256-Bit SSL Encrypted Access</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="gov-auth-body">
          {/* Tab Selection */}
          <div className="gov-auth-tabs">
            <button
              type="button"
              onClick={() => { setTab('signin'); setErrorMsg(''); }}
              className={`gov-auth-tab-btn ${tab === 'signin' ? 'active' : ''}`}
            >
              <LogIn size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
              लॉग इन / Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setErrorMsg(''); }}
              className={`gov-auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
            >
              <UserPlus size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
              पंजीकरण / Register
            </button>
          </div>

          {/* Google Single Sign-On Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '0.86rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.32 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.68 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Google खाते से जारी रखें / Continue with Google</span>
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ padding: '0 8px' }}>अथवा ईमेल क्रेडेंशियल / or Email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#166534',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <>
                {/* Full Name */}
                <div className="gov-form-group">
                  <label className="gov-form-label">
                    <span>पूरा नाम / Full Name</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="gov-input-wrapper">
                    <User size={15} color="var(--text-muted)" />
                    <input
                      type="text"
                      required
                      placeholder="उदा. रमेश कुमार / e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Citizen Role Category */}
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
                        required
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
                        required
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
              </>
            )}

            {/* Email */}
            <div className="gov-form-group">
              <label className="gov-form-label">
                <span>ईमेल पता / Official or Personal Email</span>
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="gov-input-wrapper">
                <Mail size={15} color="var(--text-muted)" />
                <input
                  type="email"
                  required
                  placeholder="citizen@gov.in / name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="gov-form-group">
              <label className="gov-form-label">
                <span>सुरक्षित पासवर्ड / Secure Password</span>
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="gov-input-wrapper">
                <Lock size={15} color="var(--text-muted)" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.92rem',
                fontWeight: '700',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <span>प्रमाणीकरण जारी है / Processing...</span>
              ) : tab === 'signup' ? (
                <>
                  <UserPlus size={16} />
                  <span>पंजीकरण पूर्ण करें / Complete Registration</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>सुरक्षित लॉग इन / Secure Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Continue as Guest */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              अतिथि के रूप में सीधे समाचार पढ़ें / Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
