import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, UserProfile } from '../services/user.service';
import { authService } from '../services/auth.service';
import { Settings, Shield, User, Save, Camera, Mail, X } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState<Partial<UserProfile>>({});
    const [loading, setLoading] = useState(false);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [twoFaCode, setTwoFaCode] = useState('');
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);



    useEffect(() => {
        if (user) {
            loadSettings();
            check2FAOption();
        }
    }, [user]);

    const loadSettings = async () => {
        try {
            if (!user) return;
            const data = await userService.fetchUserProfile(user.id);
            setProfile(data);
            if (data.avatar_url) {
                setAvatarPreview(data.avatar_url);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const check2FAOption = async () => {
        try {
            const status = await authService.get2faStatus();
            setIs2FAEnabled(status.enabled);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ text: 'File size must be less than 2MB', type: 'error' });
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setAvatarPreview(event.target.result as string);
                    setProfile({ ...profile, avatar_url: event.target.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMessage(null);
        try {
            await userService.updateProfile(user.id, profile);
            await refreshUser();
            setMessage({ text: 'Settings saved successfully!', type: 'success' });
        } catch (e) {
            setMessage({ text: 'Failed to update settings', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle2FA = async () => {
        try {
            if (is2FAEnabled) {
                if (window.confirm('Are you sure you want to disable 2FA?')) {
                    await authService.disable2fa();
                    setIs2FAEnabled(false);
                    setMessage({ text: '2FA Disabled', type: 'success' });
                }
            } else {
                const data = await authService.generate2faSecret();
                setQrCode(data.qrCode);
                setShow2FAModal(true);
            }
        } catch (e: any) {
            setMessage({ text: e.message || 'Failed to toggle 2FA', type: 'error' });
        }
    };

    const confirmEnable2FA = async () => {
        try {
            await authService.enable2fa(twoFaCode);
            setIs2FAEnabled(true);
            setShow2FAModal(false);
            setTwoFaCode('');
            setMessage({ text: '2FA Enabled Successfully!', type: 'success' });
        } catch (e: any) {
            setMessage({ text: e.message || 'Invalid verification code', type: 'error' });
        }
    };

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-8 mb-6">
                    <div className="flex items-center mb-2">
                        <Settings className="w-8 h-8 text-rose-500 mr-3" />
                        <h2 className="text-3xl font-bold text-white">Settings</h2>
                    </div>
                    <p className="text-gray-400">Manage your profile and security settings</p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-xl mb-6 flex items-center justify-between ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} className="hover:opacity-75">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Profile Settings Card */}
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-8 mb-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <User className="w-6 h-6 text-blue-400 mr-2" />
                        Profile Information
                    </h3>

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-rose-500/50 bg-gray-700 shadow-lg">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
                                            <span className="text-4xl text-gray-400 font-bold">
                                                {profile.display_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-rose-600 hover:bg-rose-700 p-2.5 rounded-full shadow-lg transition-all group-hover:scale-110"
                                >
                                    <Camera className="w-5 h-5 text-white" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-sm text-gray-500 mt-3">Click camera to upload (max 2MB)</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Display Name */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm font-medium">Display Name</label>
                                <div className="flex items-center bg-gray-800/50 rounded-xl px-4 py-3 border border-white/10 focus-within:border-rose-500/50 transition-colors">
                                    <User className="w-5 h-5 text-gray-500 mr-3" />
                                    <input
                                        type="text"
                                        value={profile.display_name || ''}
                                        onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                                        placeholder="Your display name"
                                        className="bg-transparent border-none focus:outline-none text-white w-full placeholder-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Email (Read-only) */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm font-medium">Email</label>
                                <div className="flex items-center bg-gray-800/30 rounded-xl px-4 py-3 border border-white/5">
                                    <Mail className="w-5 h-5 text-gray-500 mr-3" />
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="bg-transparent border-none text-gray-500 w-full cursor-not-allowed"
                                    />
                                </div>
                            </div>


                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Security Card */}
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <Shield className="w-6 h-6 text-blue-400 mr-2" />
                        Security
                    </h3>

                    <div className="flex items-center justify-between bg-gray-800/50 p-5 rounded-xl border border-white/10">
                        <div>
                            <p className="text-white font-medium text-lg">Two-Factor Authentication</p>
                            <p className="text-sm text-gray-400 mt-1">Add an extra layer of security to your account</p>
                            {is2FAEnabled && (
                                <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                    ✓ Enabled
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleToggle2FA}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${is2FAEnabled
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                }`}
                        >
                            {is2FAEnabled ? 'Disable' : 'Enable 2FA'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2FA Setup Modal */}
            {show2FAModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white">Setup 2FA</h3>
                            <button onClick={() => setShow2FAModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <p className="text-gray-400 mb-6 text-sm">
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                        </p>

                        <div className="flex justify-center mb-6 bg-white p-4 rounded-xl">
                            {qrCode && <img src={qrCode} alt="2FA QR Code" className="max-w-full" />}
                        </div>

                        <p className="text-gray-400 mb-3 text-sm text-center">
                            Enter the 6-digit code from your app:
                        </p>

                        <input
                            type="text"
                            placeholder="000000"
                            value={twoFaCode}
                            onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full bg-gray-800 text-white px-4 py-4 rounded-xl mb-6 text-center tracking-[0.5em] text-2xl font-mono border border-white/10 focus:border-rose-500/50 focus:outline-none"
                            maxLength={6}
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShow2FAModal(false); setTwoFaCode(''); }}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmEnable2FA}
                                disabled={twoFaCode.length !== 6}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Verify & Enable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
