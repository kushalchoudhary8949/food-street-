/**
 * @file AdminLogin.js
 * @module components/AdminLogin
 * @description
 * Secure Administrator Authentication Portal for FoodZa.
 * 
 * Architectural Role:
 * - Renders a tamper-resistant login gateway gating access to the operations dashboard (`AdminTab`).
 * - Integrates directly with `utils/adminAuth.js` to enforce:
 *   1. SHA-256 salted password hashing verification (zero plaintext password leakage).
 *   2. Client-side brute-force mitigation and lockout countdowns (`checkRateLimit`, `recordFailedAttempt`).
 *   3. Session token issuance with cryptographic HMAC signatures (`createAdminSession`).
 * 
 * Component State & Flow:
 * - `adminId` & `password`: Controlled credential input states.
 * - `lockoutSecs`: Real-time countdown timer reflecting active brute-force lockouts.
 * - `rememberMe`: Determines whether the session token persists across browser restarts (`localStorage` vs `sessionStorage`).
 * - `handleSubmit`: Orchestrates rate-limit checks, verification, session issuance, and `onLoginSuccess` callback.
 * 
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback invoked upon successful authentication to lift the admin gate in `App.js`.
 * @param {Function} props.onBackToStore - Callback invoked to return to the public customer storefront.
 */

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { verifyCredentials, createAdminSession, checkRateLimit, recordFailedAttempt, resetRateLimit } from '../utils/adminAuth';

export const AdminLogin = ({ onLoginSuccess, onBackToStore }) => {
    // -------------------------------------------------------------
    // Authentication State & Form Controls
    // -------------------------------------------------------------
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lockoutSecs, setLockoutSecs] = useState(0);

    // -------------------------------------------------------------
    // Rate-Limiting & Lockout Countdown Interval
    // Polls rate-limit state every 1s to update the lockout timer UI.
    // -------------------------------------------------------------
    useEffect(() => {
        const check = () => {
            const { isLocked, remainingSeconds } = checkRateLimit();
            setLockoutSecs(isLocked ? remainingSeconds : 0);
        };
        check();
        const interval = setInterval(check, 1000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Handles credential submission, rate-limit enforcement, and session generation.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(null);

        // Pre-flight check: reject attempt immediately if lockout period is currently active
        const rateStatus = checkRateLimit();
        if (rateStatus.isLocked) {
            setErrorMessage(`Access temporarily suspended due to multiple failed attempts. Please retry in ${rateStatus.remainingSeconds}s.`);
            return;
        }

        if (!adminId.trim() || !password.trim()) {
            setErrorMessage('Please enter both Admin ID and Password.');
            return;
        }

        setIsLoading(true);
        try {
            // Hash and verify credentials against salted SHA-256 signatures in adminAuth.js
            const isValid = await verifyCredentials(adminId, password);

            if (isValid) {
                // Successful authentication: clear failure count and issue signed session token
                resetRateLimit();
                await createAdminSession(rememberMe);
                onLoginSuccess();
            } else {
                // Failed authentication: increment attempt counter and re-check lockout threshold
                recordFailedAttempt();
                const afterStatus = checkRateLimit();
                if (afterStatus.isLocked) {
                    setErrorMessage(`Security lockout triggered. Too many failed attempts. Try again in ${afterStatus.remainingSeconds}s.`);
                } else {
                    setErrorMessage('Access Denied: Invalid Admin ID or Password.');
                }
            }
        } catch {
            setErrorMessage('An error occurred during authentication. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isLockedOut = lockoutSecs > 0;

    return (
        _jsxs("div", { className: "min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white select-none", children: [
            _jsxs("div", { className: "fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center", children: [
                _jsx("div", { className: "w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl -translate-y-20" }),
                _jsx("div", { className: "w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl translate-y-32" })
            ] }),
            _jsxs("div", { className: "w-full max-w-md relative z-10", children: [
                _jsxs("button", { type: "button", onClick: onBackToStore, className: "mb-6 flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs border border-white/10 cursor-pointer", children: [
                    _jsx(ArrowLeft, { className: "w-4 h-4" }),
                    _jsx("span", { children: "Back to FoodZa" })
                ] }),
                _jsxs("div", { className: "bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6", children: [
                    _jsxs("div", { className: "text-center space-y-2", children: [
                        _jsx("div", { className: "w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-red-600/30", children: _jsx(ShieldCheck, { className: "w-8 h-8" }) }),
                        _jsx("h1", { className: "text-xl sm:text-2xl font-black tracking-tight text-white", children: "FoodZa Admin Portal" }),
                        _jsx("p", { className: "text-xs text-gray-400", children: "Protected workspace • Authorized administrator login only" })
                    ] }),
                    (errorMessage || isLockedOut) && (
                        _jsxs("div", { className: "p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start space-x-2.5 text-xs text-red-300 animate-in fade-in zoom-in-95 duration-200", children: [
                            _jsx(AlertCircle, { className: "w-4 h-4 text-red-400 shrink-0 mt-0.5" }),
                            _jsx("span", { children: isLockedOut ? `Security Lockout Active: Please wait ${lockoutSecs}s before attempting again.` : errorMessage })
                        ] })
                    ),
                    _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
                        _jsxs("div", { className: "space-y-1.5", children: [
                            _jsx("label", { className: "block text-xs font-bold text-gray-300 uppercase tracking-wider", children: "Admin ID" }),
                            _jsxs("div", { className: "relative flex items-center", children: [
                                _jsx("div", { className: "absolute left-3.5 text-gray-400", children: _jsx(User, { className: "w-4 h-4" }) }),
                                _jsx("input", { id: "admin-id-input", type: "text", required: true, disabled: isLockedOut || isLoading, autoComplete: "username", placeholder: "Enter admin ID", value: adminId, onChange: (e) => setAdminId(e.target.value), className: "w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700/80 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50" })
                            ] })
                        ] }),
                        _jsxs("div", { className: "space-y-1.5", children: [
                            _jsx("label", { className: "block text-xs font-bold text-gray-300 uppercase tracking-wider", children: "Password" }),
                            _jsxs("div", { className: "relative flex items-center", children: [
                                _jsx("div", { className: "absolute left-3.5 text-gray-400", children: _jsx(Lock, { className: "w-4 h-4" }) }),
                                _jsx("input", { id: "admin-password-input", type: showPassword ? 'text' : 'password', required: true, disabled: isLockedOut || isLoading, autoComplete: "current-password", placeholder: "••••••••••••", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full pl-10 pr-11 py-3 bg-gray-800/80 border border-gray-700/80 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-mono disabled:opacity-50" }),
                                _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3.5 text-gray-400 hover:text-gray-200 transition-colors p-1 cursor-pointer", title: showPassword ? 'Hide password' : 'Show password', children: showPassword ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) })
                            ] })
                        ] }),
                        _jsx("div", { className: "flex items-center justify-between pt-1", children: [
                            _jsxs("label", { className: "flex items-center space-x-2 text-xs text-gray-400 cursor-pointer", children: [
                                _jsx("input", { type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), className: "w-4 h-4 rounded-md bg-gray-800 border-gray-700 text-red-600 focus:ring-red-500 accent-red-600" }),
                                _jsx("span", { children: "Remember this device" })
                            ] })
                        ] }),
                        _jsx("button", { id: "admin-login-submit-btn", type: "submit", disabled: isLoading || isLockedOut, className: "w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-red-600/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer mt-2", children: isLoading ? (
                            _jsx("div", { className: "w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" })
                        ) : (
                            _jsxs(_Fragment, { children: [
                                _jsx("span", { children: isLockedOut ? `Locked (${lockoutSecs}s)` : "Sign In to Admin" }),
                                _jsx(ArrowRight, { className: "w-4 h-4" })
                            ] })
                        ) })
                    ] }),
                    _jsx("div", { className: "pt-2 text-center text-[11px] text-gray-500 border-t border-gray-800/80", children: "🔒 Cryptographically signed, tamper-protected admin session." })
                ] })
            ] })
        ] })
    );
};
