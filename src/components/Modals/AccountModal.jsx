'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetChannel, setResetChannel] = useState('email');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetStep, setResetStep] = useState('phone');
  const [resetError, setResetError] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [category, setCategory] = useState('citizen');
  const [customCategory, setCustomCategory] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const cropImageRef = useRef(null);

  useEffect(() => {
    setProfileImage(currentUser?.profileImage || '');
    setEditName(currentUser?.name || '');
    setEditEmail(currentUser?.email || '');
    setEmailOtp('');
    setEmailOtpSent(false);
    setIsEditingDetails(false);
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
          email,
          password,
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
      onAuthSuccess(result.user, { interactive: true });
      onClose();
      setMode('login');
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setLoginPassword('');
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
        body: JSON.stringify({ phone: loginPhone, password: loginPassword })
      });
      const result = await response.json();
      if (response.status === 404) {
        setPhone(loginPhone);
        setMode('signup');
        showToast('Account not found. Please sign up to continue.');
        return;
      }
      if (!response.ok) throw new Error(result.message || 'Unable to log in.');
      onAuthSuccess(result.user, { interactive: true });
      onClose();
      showToast('Logged in successfully.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPasswordReset = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: resetChannel,
          phone: resetPhone,
          email: resetEmail
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to send reset code.');
      setResetStep('verify');
      setResetError('');
      showToast('Verification code sent to your phone.');
    } catch (error) {
      setResetError(error.message);
      showToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: resetChannel,
          phone: resetPhone,
          email: resetEmail,
          otp: resetOtp,
          password: resetPassword
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to reset your password.');
      setLoginPhone(resetPhone);
      setLoginPassword('');
      setResetPhone('');
      setResetEmail('');
      setResetOtp('');
      setResetPassword('');
      setResetStep('phone');
      setResetError('');
      setMode('login');
      showToast('Password updated. You can now log in.');
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

  const handleSaveDetails = async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const emailChanged = editEmail.trim().toLowerCase() !== (currentUser.email || '').trim().toLowerCase();
    if (emailChanged && !emailOtpSent) {
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/auth/profile/request-email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: editEmail })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to send email verification code.');
        setEmailOtpSent(true);
        showToast('Verification code sent to your new email.');
      } catch (error) {
        showToast(error.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, emailOtp })
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Unable to update account details.');

      onAuthSuccess({ ...currentUser, ...result.user });
      setIsEditingDetails(false);
      setEmailOtp('');
      setEmailOtpSent(false);
      showToast('Account details updated.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProfilePassword = async (event) => {
    event.preventDefault();
    if (profilePassword !== profilePasswordConfirm) {
      showToast('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: profilePassword })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to add password.');
      onAuthSuccess({ ...currentUser, ...result.user, hasPassword: true });
      setProfilePassword('');
      setProfilePasswordConfirm('');
      showToast('Password added successfully.');
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
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(typeof reader.result === 'string' ? reader.result : '');
      setCropZoom(1);
      setCropX(50);
      setCropY(50);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleApplyCrop = () => {
    const image = cropImageRef.current;
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const scale = Math.max(512 / image.naturalWidth, 512 / image.naturalHeight) * cropZoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const left = (512 - width) * (cropX / 100);
    const top = (512 - height) * (cropY / 100);
    context.drawImage(image, left, top, width, height);
    const result = canvas.toDataURL('image/jpeg', 0.86);
    setProfileImage(result);
    const nextUser = currentUser ? { ...currentUser, profileImage: result } : null;
    if (nextUser) onAuthSuccess(nextUser);
    setCropSource('');
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
        <button
          className="account-edit-btn"
          type="button"
          onClick={() => setIsEditingDetails((isEditing) => !isEditing)}
          aria-label={isEditingDetails ? 'Close account details editor' : 'Edit account details'}
          title={isEditingDetails ? 'Close editor' : 'Edit account details'}
        >
          ⚙
        </button>
      </div>

      {isEditingDetails && (
        <form className="account-details-form" onSubmit={handleSaveDetails}>
          <label className="settings-label" htmlFor="edit-account-name">Name</label>
          <input id="edit-account-name" className="settings-input" type="text" value={editName} onChange={(event) => setEditName(event.target.value)} required />
          <label className="settings-label" htmlFor="edit-account-email">Gmail or email address <span className="optional-field">(optional)</span></label>
          <input id="edit-account-email" className="settings-input" type="email" placeholder="you@gmail.com" value={editEmail} onChange={(event) => { setEditEmail(event.target.value); setEmailOtp(''); setEmailOtpSent(false); }} />
          {emailOtpSent && (
            <>
              <label className="settings-label" htmlFor="edit-account-email-otp">Email verification code</label>
              <input id="edit-account-email-otp" className="settings-input otp-input" type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={emailOtp} onChange={(event) => setEmailOtp(event.target.value)} required />
            </>
          )}
          <button className="account-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save details'}
          </button>
        </form>
      )}

      <label className="account-upload-btn">
        <input type="file" accept="image/*" onChange={handleProfileImageSelection} />
        {profileImage || currentUser?.profileImage ? 'Change profile picture' : 'Add profile picture'}
      </label>

      <button className="account-submit-btn" type="button" onClick={handleSaveProfileImage} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save profile picture'}
      </button>

      {!currentUser?.hasPassword && (
        <form className="account-details-form" onSubmit={handleAddProfilePassword}>
          <p className="account-form-note">Add a password to make future logins more secure.</p>
          <label className="settings-label" htmlFor="profile-password">New password</label>
          <input id="profile-password" className="settings-input" type="password" placeholder="At least 8 characters" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} minLength={8} required />
          <label className="settings-label" htmlFor="profile-password-confirm">Confirm password</label>
          <input id="profile-password-confirm" className="settings-input" type="password" placeholder="Re-enter your password" value={profilePasswordConfirm} onChange={(event) => setProfilePasswordConfirm(event.target.value)} minLength={8} required />
          <button className="account-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding password...' : 'Add password'}
          </button>
        </form>
      )}

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
      <label className="settings-label" htmlFor="account-email">Gmail or email address <span className="optional-field">(optional)</span></label>
      <input id="account-email" className="settings-input" type="email" placeholder="you@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="settings-label" htmlFor="account-password">Password</label>
        <input id="account-password" className="settings-input" type="password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
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
        ) : mode === 'reset' ? (
          resetStep === 'phone' ? (
            <form className="account-form" onSubmit={handleRequestPasswordReset}>
              <p className="account-form-note">Choose where to receive your verification code.</p>
              {resetError && <p className="account-form-error">{resetError}</p>}
              <div className="reset-channel-options" role="group" aria-label="Verification delivery method">
                <button type="button" className={resetChannel === 'email' ? 'selected' : ''} onClick={() => setResetChannel('email')}>Email</button>
                <button type="button" className={resetChannel === 'phone' ? 'selected' : ''} onClick={() => setResetChannel('phone')}>SMS</button>
              </div>
              {resetChannel === 'email' ? (
                <>
                  <label className="settings-label" htmlFor="reset-email">Email address</label>
                  <input id="reset-email" className="settings-input" type="email" placeholder="you@example.com" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required autoFocus />
                </>
              ) : (
                <>
                  <label className="settings-label" htmlFor="reset-phone">Phone number</label>
                  <input id="reset-phone" className="settings-input" type="tel" placeholder="10-digit phone number" value={resetPhone} onChange={(event) => setResetPhone(event.target.value)} required autoFocus />
                </>
              )}
              <button className="account-submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending code...' : `Send code by ${resetChannel === 'email' ? 'email' : 'SMS'}`}</button>
              {resetError && <button className="account-text-btn" type="button" onClick={() => { setResetError(''); setMode('login'); }}>Skip for now and return to log in</button>}
              <button className="account-text-btn" type="button" onClick={() => setMode('login')}>Back to log in</button>
            </form>
          ) : (
            <form className="account-form" onSubmit={handleResetPassword}>
              <p className="account-form-note">Enter the code sent to your {resetChannel === 'email' ? 'email' : 'phone'} and choose a new password.</p>
              <label className="settings-label" htmlFor="reset-otp">Verification code</label>
              <input id="reset-otp" className="settings-input otp-input" type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={resetOtp} onChange={(event) => setResetOtp(event.target.value)} required autoFocus />
              <label className="settings-label" htmlFor="reset-password">New password</label>
              <input id="reset-password" className="settings-input" type="password" placeholder="At least 8 characters" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} minLength={8} required />
              <button className="account-submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating password...' : 'Set new password'}</button>
              <button className="account-text-btn" type="button" onClick={() => setResetStep('phone')}>Use a different phone number</button>
            </form>
          )
        ) : mode === 'login' ? (
          <form className="account-form" onSubmit={handleLogin}>
            <p className="account-form-note">Enter your registered phone number and password to log in.</p>
            <label className="settings-label" htmlFor="login-phone">Phone number</label>
            <input id="login-phone" className="settings-input" type="tel" placeholder="10-digit phone number" value={loginPhone} onChange={(event) => setLoginPhone(event.target.value)} required autoFocus />
            <label className="settings-label" htmlFor="login-password">Password</label>
            <input id="login-password" className="settings-input" type="password" placeholder="Your password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} minLength={8} required />
            <button className="account-submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
            <button className="account-text-btn" type="button" onClick={() => setMode('reset')}>Forgot password?</button>
          </form>
        ) : (
          <form className="account-form" onSubmit={handleSignup}>
            {renderProfileFields()}
            <button className="account-submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button>
          </form>
        )}
      </div>
      {cropSource && (
        <div className="profile-crop-backdrop" onClick={() => setCropSource('')}>
          <div className="profile-crop-modal" onClick={(event) => event.stopPropagation()}>
            <div className="compare-modal-header">
              <h2 className="compare-modal-title">Crop profile picture</h2>
              <button className="compare-modal-close" type="button" onClick={() => setCropSource('')} aria-label="Close crop editor">✕</button>
            </div>
            <div className="profile-crop-frame">
              <img
                ref={cropImageRef}
                src={cropSource}
                alt="Profile crop preview"
                style={{ transform: `scale(${cropZoom})`, objectPosition: `${cropX}% ${cropY}%` }}
              />
          </div>
            <label className="profile-crop-control">Zoom
              <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} />
            </label>
            <label className="profile-crop-control">Horizontal position
              <input type="range" min="0" max="100" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} />
            </label>
            <label className="profile-crop-control">Vertical position
              <input type="range" min="0" max="100" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} />
            </label>
            <div className="settings-actions">
              <button className="header-btn" type="button" onClick={() => setCropSource('')}>Cancel</button>
              <button className="header-btn active" type="button" onClick={handleApplyCrop}>Use Cropped Photo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}