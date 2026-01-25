import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 py-6 mt-auto relative z-10 w-full px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                <div className="mb-4 md:mb-0">
                    &copy; {new Date().getFullYear()} M&MS. All rights reserved.
                </div>
                <div className="flex space-x-6">
                    <Link to="/privacy" className="hover:text-rose-500 transition-colors duration-200">
                        Privacy Policy
                    </Link>
                    <Link to="/meet-the-devs" className="hover:text-rose-500 transition-colors duration-200">
                        Meet the Developers
                    </Link>
                    <Link to="/terms" className="hover:text-rose-500 transition-colors duration-200">
                        Terms & Conditions
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
