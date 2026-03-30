import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, CheckCircle, GraduationCap, BarChart3, LogIn, LogOut, Shield } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const Navbar = () => {

    const isLoggedIn = useAppStore(s => s.isLoggedIn);
    const currentUser = useAppStore(s => s.currentUser);
    const openAuthModal = useAppStore(s => s.openAuthModal);
    const logout = useAppStore(s => s.logout);

    const isAdminRoute = location.pathname.startsWith('/admin');

    // If we're on an admin route, we might want a different or NO sidebar (if the dashboard has its own)
    // But per user request: "Don't show the user sidebar to admins"
    if (isAdminRoute && isAdmin) return null;

    return (
        <nav className="sidebar">
            <NavLink to="/" className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="logo-icon relative w-12 h-12 flex items-center justify-center mr-3">
                    <div className="absolute inset-0 bg-[#D4AF37] rotate-45 rounded-md opacity-20 transform scale-75"></div>
                    <div className="absolute inset-0 border-2 border-[#D4AF37]/40 rotate-12 rounded-lg"></div>
                    <BookOpen color="#D4AF37" size={22} className="relative z-10 drop-shadow-sm" />
                </div>
                <div className="brand-text flex flex-col items-start justify-center">
                    <h1 className="font-amiri text-2xl text-[#FDFCF5] leading-none m-0 tracking-wide drop-shadow-md">تجويد<span className="text-[#D4AF37]">.ai</span></h1>
                </div>
            </NavLink>
            <div className="nav-links">
                <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}> <LayoutDashboard size={20} /> <span>الرئيسية</span> </NavLink>
                <NavLink to="/practice" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}> <CheckCircle size={20} /> <span>صحح تلاوتك</span> </NavLink>
                <NavLink to="/lessons" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}> <GraduationCap size={20} /> <span>الدروس</span> </NavLink>
                <NavLink to="/progress" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}> <BarChart3 size={20} /> <span>التقدم</span> </NavLink>
            </div>
            {isLoggedIn ? (
                <div className="user-profile-mini bg-transparent" onClick={logout} style={{ width: 'auto' }}>
                    <div className="w-[35px] h-[35px] rounded-full bg-secondary flex items-center justify-center font-bold text-primary"> {currentUser?.name?.[0] || 'U'} </div>
                    <LogOut size={18} className="opacity-80" />
                </div>
            ) : (
                <div className="nav-item py-2 px-4 bg-secondary text-primary rounded-full cursor-pointer" onClick={openAuthModal}> <LogIn size={20} /> <span className="text-primary">دخول</span> </div>
            )}
        </nav>
    );
};

export default Navbar;
