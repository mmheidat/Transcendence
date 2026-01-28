import React from 'react';
import { NavLink } from 'react-router-dom';
import { Gamepad2, Trophy, User, MessageSquare, Bot, Settings, LogOut } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const Navbar: React.FC = () => {
    const { logout } = useAuth();
    const { totalUnread } = useNotification();

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `nav-item flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/50 ${isActive ? 'text-white bg-rose-600 shadow-md shadow-rose-500/30' : 'text-gray-300 hover:bg-rose-600 hover:text-white'
        }`;

    return (
        <nav className="bg-gray-800/90 backdrop-blur-md shadow-xl border-b border-gray-700/50 sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo & Language */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-rose-400 via-blue-500 to-rose-600 bg-clip-text text-transparent whitespace-nowrap">
                            M&MS
                        </h1>


                    </div>

                    {/* Navigation Items */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <NavLink to="/" className={navLinkClass}>
                            <Gamepad2 className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">Play</span>
                        </NavLink>

                        <NavLink to="/leaderboard" className={navLinkClass}>
                            <Trophy className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">Leaderboard</span>
                        </NavLink>

                        <NavLink to="/profile" className={navLinkClass}>
                            <User className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">Profile</span>
                        </NavLink>

                        <NavLink to="/chat" className={navLinkClass}>
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

                        <NavLink to="/ai" className={navLinkClass}>
                            <Bot className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">AI Assistant</span>
                        </NavLink>

                        <NavLink to="/settings" className={navLinkClass}>
                            <Settings className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">Settings</span>
                        </NavLink>

                        <button
                            onClick={logout}
                            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden lg:inline text-sm">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
