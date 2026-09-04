'use client';

import { useEffect, useState } from 'react';

const categories = [
  { value: 'farmer', label: 'Farmer', icon: '🌾' },
  { value: 'fisherman', label: 'Fisherman', icon: '🎣' },
  { value: 'disaster_manager', label: 'Disaster Manager', icon: '🚨' },
  { value: 'citizen', label: 'Citizen', icon: '🏙️' },
  { value: 'other', label: 'Other', icon: '＋' },
];

export default function AccountModal({ isOpen, onClose, showToast, onAuthSuccess, currentUser }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [category, setCategory] = useState('citizen');
  const [customCategory, setCustomCategory] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setProfileImage(currentUser?.profileImage || '');
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSignup = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          name,
          phone,
          category,
          customCategory: category === 'other' ? customCategory : '',
          profileImage: profileImage.trim(),
        })
      });
      let result;
      try {
        result = await response.json();
      } catch {
        result = { message: `Signup request failed (HTTP ${response.status}).` };
      }

      if (!response.ok) throw new Error(result.message || `Signup request failed (HTTP ${response.status}).`);
      showToast(result.message || 'Account created successfully.');
      onAuthSuccess(result.user);
      onClose();
      setMode('login');
      setName('');
      setPhone('');
      setCategory('citizen');
      setCustomCategory('');
      setProfileImage('');
    } catch (error) {
      showToast(error.name === 'AbortError'
        ? 'Signup took too long. Check your Vercel and MongoDB settings, then try again.'
        : error.message);
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to log in.');
      onAuthSuccess(result.user);
      onClose();
      showToast('Logged in successfully.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfileImage = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImage: profileImage.trim() })
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Unable to update profile picture.');

      onAuthSuccess({ ...currentUser, profileImage: result.user.profileImage || '' });
      showToast('Profile picture updated.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Unable to log out.');

      onAuthSuccess(null);
      onClose();
      showToast('Logged out successfully.');
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleProfileImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setProfileImage(result);
      const nextUser = currentUser ? { ...currentUser, profileImage: result } : null;
      if (nextUser) onAuthSuccess(nextUser);
    };
    reader.readAsDataURL(file);
  };

  const renderAuthenticatedProfile = () => (
    <div className="account-profile-panel">
      <div className="account-profile-header">
        <img
          className="account-profile-avatar"
          src={profileImage || currentUser?.profileImage || '/default-avatar.svg'}
          alt={`${currentUser?.name || 'User'} profile`}
        />
        <div>
          <div className="account-profile-name">{currentUser?.name || 'My account'}</div>
          <div className="account-profile-phone">{currentUser?.phone || ''}</div>
        </div>
      </div>

      <label className="account-upload-btn">
        <input type="file" accept="image/*" onChange={handleProfileImageSelection} />
        Add image from gallery
      </label>

      <button className="account-submit-btn" type="button" onClick={handleSaveProfileImage} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save profile picture'}
      </button>

      <button className="account-logout-btn" type="button" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );

  const renderProfileFields = () => (
    <>
      <label className="settings-label" htmlFor="account-name">User name</label>
      <input id="account-name" className="settings-input" type="text" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required />
      <label className="settings-label" htmlFor="account-phone">Phone number</label>
      <input id="account-phone" className="settings-input" type="tel" placeholder="10-digit phone number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
      <span className="settings-label">Choose your category</span>
      <div className="category-slides" role="radiogroup" aria-label="Choose your category">
        {categories.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`category-slide ${category === item.value ? 'selected' : ''}`}
            onClick={() => setCategory(item.value)}
            role="radio"
            aria-checked={category === item.value}
          >
            <span className="category-slide-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      {category === 'other' && (
        <input
          className="settings-input custom-category-input"
          type="text"
          placeholder="Enter your category"
          value={customCategory}
          onChange={(event) => setCustomCategory(event.target.value)}
          required
          autoFocus
        />
      )}
    </>
  );

  return (
    <div className="compare-backdrop" onClick={onClose}>
      <div className="account-modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="compare-modal-header">
          <div>
            <h2 className="compare-modal-title">Your WeatherGPT account</h2>
            <p className="account-modal-subtitle">Optional for weather. Required for personalization and SMS alerts.</p>
          </div>
          <button className="compare-modal-close" onClick={onClose} aria-label="Close account dialog">✕</button>
        </div>

        {!currentUser && (
          <div className="account-mode-tabs" role="tablist" aria-label="Account actions">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} role="tab" aria-selected={mode === 'login'}>Log in</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} role="tab" aria-selected={mode === 'signup'}>Sign up</button>
          </div>
        )}

        {currentUser ? (
          renderAuthenticatedProfile()
        ) : mode === 'login' ? (
          <form className="account-form" onSubmit={handleLogin}>
            <p className="account-form-note">Enter your registered phone number to log in.</p>
            <label className="settings-label" htmlFor="login-phone">Phone number</label>
            <input id="login-phone" className="settings-input" type="tel" placeholder="10-digit phone number" value={loginPhone} onChange={(event) => setLoginPhone(event.target.value)} required autoFocus />
            <button className="account-submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
          </form>
        ) : (
          <form className="account-form" onSubmit={handleSignup}>
            {renderProfileFields()}
            <button className="account-submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button>
          </form>
        )}
      </div>
    </div>
  );
}