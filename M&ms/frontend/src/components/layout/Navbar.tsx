import React from 'react';
import { NavLink } from 'react-router-dom';
import { Gamepad2, Trophy, User, MessageSquare, Bot, Settings, LogOut, Menu, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Modal from '../ui/Modal';

const Navbar: React.FC = () => {
    const { logout } = useAuth();
    const { totalUnread } = useNotification();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `nav-item flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/50 ${isActive ? 'text-white bg-rose-600 shadow-md shadow-rose-500/30' : 'text-gray-300 hover:bg-rose-600 hover:text-white'
        }`;

    const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `nav-item flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/50 ${isActive ? 'text-white bg-rose-600 shadow-md shadow-rose-500/30' : 'text-gray-300 hover:bg-rose-600 hover:text-white'
        }`;

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
        setIsMobileMenuOpen(false);
    };

    const handleConfirmLogout = () => {
        logout();
        setIsLogoutModalOpen(false);
    };

    return (
        <>
            <nav className="bg-gray-800/90 backdrop-blur-md shadow-xl border-b border-gray-700/50 sticky top-0 z-50">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* Logo */}
                        <div className="flex items-center">
                            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-rose-400 via-blue-500 to-rose-600 bg-clip-text text-transparent whitespace-nowrap">
                                M&MS
                            </h1>
                        </div>

                        {/* Desktop Navigation Items */}
                        <div className="hidden md:flex items-center space-x-1 sm:space-x-2">
                            <NavLink to="/" className={desktopNavLinkClass}>
                                <Gamepad2 className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">Play</span>
                            </NavLink>

                            <NavLink to="/leaderboard" className={desktopNavLinkClass}>
                                <Trophy className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">Leaderboard</span>
                            </NavLink>

                            <NavLink to="/profile" className={desktopNavLinkClass}>
                                <User className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">Profile</span>
                            </NavLink>

                            <NavLink to="/chat" className={desktopNavLinkClass}>
                                <div className="relative">
                                    <MessageSquare className="w-5 h-5" />
                                    {totalUnread > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-gray-800">
                                            {totalUnread > 9 ? '9+' : totalUnread}
                                        </span>
                                    )}
                                </div>
                                <span className="hidden lg:inline text-sm">Chat</span>
                            </NavLink>

                            <NavLink to="/ai" className={desktopNavLinkClass}>
                                <Bot className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">AI Assistant</span>
                            </NavLink>

                            <NavLink to="/settings" className={desktopNavLinkClass}>
                                <Settings className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">Settings</span>
                            </NavLink>

                            <button
                                onClick={handleLogoutClick}
                                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">Logout</span>
                            </button>
                        </div>

                        {/* Mobile Hamburger Button */}
                        <button
                            className="md:hidden flex items-center justify-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            onClick={() => setIsMobileMenuOpen(prev => !prev)}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-md">
                        <div className="px-4 py-3 space-y-1">
                            <NavLink to="/" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                <Gamepad2 className="w-5 h-5" />
                                <span className="text-sm">Play</span>
                            </NavLink>

                            <NavLink to="/leaderboard" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                <Trophy className="w-5 h-5" />
                                <span className="text-sm">Leaderboard</span>
                            </NavLink>

                            <NavLink to="/profile" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                <User className="w-5 h-5" />
                                <span className="text-sm">Profile</span>
                            </NavLink>

                            <NavLink to="/chat" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                <div className="relative">
                                    <MessageSquare className="w-5 h-5" />
                                    {totalUnread > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-gray-800">
                                            {totalUnread > 9 ? '9+' : totalUnread}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm">Chat</span>
                            </NavLink>

                            <NavLink to="/ai" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                <Bot className="w-5 h-5" />
                                <span className="text-sm">AI Assistant</span>
                            </NavLink>

                            <NavLink to="/settings" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                <Settings className="w-5 h-5" />
                                <span className="text-sm">Settings</span>
                            </NavLink>

                            <button
                                onClick={handleLogoutClick}
                                className="w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-all duration-300"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <Modal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                title="Confirm Logout"
            >
                <div className="space-y-6">
                    <p className="text-gray-300">
                        Are you sure you want to log out? You will need to sign in again to access your account.
                    </p>
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => setIsLogoutModalOpen(false)}
                            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmLogout}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Navbar;
