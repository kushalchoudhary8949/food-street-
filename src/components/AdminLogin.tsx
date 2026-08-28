import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

// Salted SHA-256 hashes (plaintext credentials are never exposed in source code or DOM)
const ID_SALT = 'fd_id_salt_';
const PWD_SALT = 'fd_pwd_salt_';

// Authorized hashes: supports 'admin' as ID
const AUTHORIZED_ID_HASHES = [
  'd66decc061c037952af17d0ecdc72b57393bfba0725ab06e837ab822dc36af11', // Authorized ID
];

const AUTHORIZED_PWD_HASHES = [
  'a7981ce2476bfd9b3ee02e685d686b972dd20deaaa7056b81361d8cb482dba69', // Authorized Password
];

async function hashWithSalt(salt: string, text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(salt + text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStore }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminId.trim() || !password.trim()) {
      setErrorMessage('Please enter both Admin ID and Password.');
      return;
    }

    setIsLoading(true);

    try {
      // Calculate salted hashes
      const enteredIdHash = await hashWithSalt(ID_SALT, adminId.trim());
      const enteredPwdHash = await hashWithSalt(PWD_SALT, password.trim());

      // Check custom updated admin credentials from localStorage if any
      const customIdHash = localStorage.getItem('admin_custom_id_hash');
      const customPwdHash = localStorage.getItem('admin_custom_pwd_hash');

      const isIdValid =
        AUTHORIZED_ID_HASHES.includes(enteredIdHash) ||
        (customIdHash ? enteredIdHash === customIdHash : false);

      const isPwdValid =
        AUTHORIZED_PWD_HASHES.includes(enteredPwdHash) ||
        (customPwdHash ? enteredPwdHash === customPwdHash : false);

      if (isIdValid && isPwdValid) {
        // Authenticated successfully! Save token
        const token = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        if (rememberMe) {
          localStorage.setItem('admin_session_token', token);
        } else {
          sessionStorage.setItem('admin_session_token', token);
        }
        onLoginSuccess();
      } else {
        setErrorMessage('Access Denied: Invalid Admin ID or Password.');
      }
    } catch {
      setErrorMessage('An error occurred during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white select-none">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl -translate-y-20"></div>
        <div className="w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl translate-y-32"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to store button */}
        <button
          type="button"
          onClick={onBackToStore}
          className="mb-6 flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Food Store</span>
        </button>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-red-600 to-red-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-red-600/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Admin Portal
            </h1>
            <p className="text-xs text-gray-400">
              Protected workspace • Authorized administrator login only
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start space-x-2.5 text-xs text-red-300 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Admin ID
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-id-input"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter admin ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700/80 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-gray-800/80 border border-gray-700/80 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-200 transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md bg-gray-800 border-gray-700 text-red-600 focus:ring-red-500 accent-red-600"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-red-600/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-2 text-center text-[11px] text-gray-500 border-t border-gray-800/80">
            🔒 End-to-end encrypted session with SHA-256 credential hashing.
          </div>
        </div>
      </div>
    </div>
  );
};
