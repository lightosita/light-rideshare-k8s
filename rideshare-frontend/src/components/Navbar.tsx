'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { useState } from 'react';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuthStore();


    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
    };

    return (
        <div>
            <nav className="bg-white/80 w-full backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
                <div className="w-11/12 mx-auto py-4">
                    <div className="flex justify-between items-center">
                        <Link href='/' className="flex items-center space-x-2">

                            <span className="text-xl font-bold text-slate-800">Swift<span className='text-blue-600'>Ride</span></span>
                        </Link>

                        <div className="hidden md:flex space-x-4 items-center">
                            {!isAuthenticated ? (
                                <>
                                    <Link href="/auth/login">
                                        <button className="px-4 py-2 text-slate-700 font-medium hover:text-blue-600 transition-colors">
                                            Login
                                        </button>
                                    </Link>
                                    <Link href="/auth/register">
                                        <button className="px-6 py-2 bg-linear-to-r from-cyan-600 to-blue-700 text-white font-medium rounded-lg hover:shadow-lg transition-all">
                                            Get Started
                                        </button>
                                    </Link>
                                </>
                            ) : (
                                <div className="flex items-center space-x-4">

                                    <div className="flex items-center space-x-6">
                                            <div className="text-center text-sm text-slate-600 py-2">
                                                Hello, {user?.displayName} 
                                            </div>
                                        <button
                                            onClick={handleLogout}
                                            className="px-4 py-2 text-slate-700 font-medium border border-slate-300 rounded-lg hover:border-red-500 hover:text-red-600 transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden text-slate-700"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {isMenuOpen && (
                        <div className="md:hidden mt-4 py-4 border-t border-slate-200">
                            <div className="flex flex-col space-y-4">

                                <div className="pt-4 flex flex-col space-y-3">
                                    {!isAuthenticated ? (
                                        <>
                                            <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                                                <button className="w-full py-2 text-slate-700 font-medium border border-slate-300 rounded-lg hover:border-blue-500 transition-colors">
                                                    Login
                                                </button>
                                            </Link>
                                            <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                                                <button className="w-full py-2 bg-linear-to-r from-cyan-600 to-blue-700 text-white font-medium rounded-lg hover:shadow-lg transition-all">
                                                    Get Started
                                                </button>
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                           
                                            <div className="text-center text-sm text-slate-600 py-2">
                                                Hello, {user?.displayName}
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full py-2 text-red-600 font-medium border border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                Logout
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default Navbar;