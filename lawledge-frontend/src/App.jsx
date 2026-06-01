import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useState } from 'react';
import { 
  BookOpen, ShieldAlert, Phone, Bot, Eye, EyeOff, 
  Rss, User, ShieldCheck, Film, Compass, MessageSquare,
  Search, Trophy, Award, Shield, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Core State Providers (.jsx files containing ONLY React components)
import { AppProvider } from './lib/context.jsx';
import { AuthProvider } from './lib/AuthContext';
import { SocketProvider } from './lib/SocketContext';

// Standardized Shared Hooks Channel (.js file containing custom hooks)
import { useAuth, useApp } from './lib/hooks';

// Dashboard Tool Components
import DirectoryModule from './modules/directory/DirectoryModule';
import EducationModule from './modules/education/FlashcardModule';
import EmergencyHub from './modules/emergency/EmergencyHub';
import { AgentInterface } from './modules/ai-agent';

// Integrated Volunteer Social System Pages
import Feed from "./Pages/Feed";
import Profile from "./Pages/Profile";
import Reels from "./Pages/Reels";
import HelpRequests from "./Pages/HelpRequests";
import AuthorityLeaderboard from "./Components/AuthorityLeaderboard";
import VolunteerLeaderboard from "./Components/VolunteerLeaderboard";
import Explore from "./Pages/Explore";
import VolunteerHub from "./Pages/VolunteerHub";


import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Messages from "./Pages/Messages";
import Notifications from "./Pages/Notifications";

// Split Administrative Control Components
import AdminDashboard from "./Pages/AdminDashboard";
import VolunteerAdmin from "./Pages/VolunteerAdmin";

// Core Platform Pages
import FileComplaint from "./Pages/FileComplaint";
import ApprovedComplaints from "./Pages/ApprovedComplaints";
import TrackComplaint from "./Pages/TrackComplaint";
import Questions from "./Pages/Questions";
import CreatePost from "./Components/CreatePost";

import "./App.css";

// Standardized Side Navigation Target Configuration Array
const SIDEBAR_LINKS = [
  { to: "/", label: "Home Tools", icon: <Bot size={18} /> },
  { to: "/complaints", label: "File Complaint", icon: <ShieldCheck size={18} /> },
  { to: "/approved-complaints", label: "Complaints Portal", icon: <BookOpen size={18} /> },
  { to: "/track", label: "Track Complaint", icon: <Search size={18} /> },
  { to: "/leaderboard", label: "Authority Board", icon: <Trophy size={18} /> },
  { to: "/admin", label: "Platform Admin", icon: <Shield size={18} /> },
  { to: "/profile", label: "My Profile", icon: <User size={18} /> },
  // Legal tools kept as top-level (non-social)
  { to: "/help", label: "Help Line Hub", icon: <ShieldAlert size={18} /> },


];c

function NavButton({ active, onClick, icon, label, isAI, highViz }) {
  const activeStyles = highViz 
    ? 'bg-black text-yellow-400 border-2 border-yellow-400 scale-105' 
    : (isAI ? 'bg-amber-500 text-white shadow-lg scale-105' : 'bg-slate-900 text-white scale-105');

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2.5 px-4 rounded-[1.25rem] sm:rounded-[1.5rem] transition-all duration-300 flex-1 ${active ? activeStyles : 'text-slate-400 hover:bg-slate-100'}`}
    >
      {icon}
      <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">{label}</span>
    </button>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { highVisibility, setHighVisibility } = useApp();
  const [activeTab, setActiveTab] = useState('directory');

  const isModularHome = pathname === "/";
  
  return (
    <div className={`app-container ${highVisibility ? 'high-viz' : ''}`}>
      
      {/* ── Fixed Sidebar Navigation System ── */}
      <nav className="navbar">
        <div className="nav-logo">
          <h2>Lawledge</h2>
          <span>Legal Portal</span>
        </div>
        
        <div className="nav-links-wrapper">
          {SIDEBAR_LINKS.map(link => (
            <Link 
              key={link.to} 
              to={link.to} 
              className={pathname === link.to ? "active" : ""}
            >
              <span className="link-icon-align">{link.icon}</span>
              <span className="link-label-align">{link.label}</span>
            </Link>
          ))}
        </div>

        <button 
          onClick={() => setHighVisibility(!highVisibility)}
          className="lg:mt-auto flex items-center justify-center gap-2 p-3 rounded-xl transition-all border-2 font-black uppercase text-[11px] w-full"
          style={highVisibility 
            ? { background: '#facc15', color: '#000', borderColor: '#000' } 
            : { background: '#f1f5f9', color: '#475569', borderColor: 'transparent' }
          }
        >
          {highVisibility ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>Contrast Mode</span>
        </button>
      </nav>

      {/* ── Main Scroll Viewport Display ── */}
      <div className="main-wrapper">
        <main className="content">
          <Routes>
            {/* Core Baseline Tools Dashboard */}
            <Route path="/" element={
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {activeTab === 'education' && <EducationModule />}
                  {activeTab === 'directory' && <DirectoryModule />}
                  {activeTab === 'emergency' && <EmergencyHub />}
                  {activeTab === 'ai' && <AgentInterface />}
                </motion.div>
              </AnimatePresence>
            } />

            {/* Volunteer Social Sub-System Tracks */}
            <Route path="/volunteer-hub" element={user ? <VolunteerHub /> : <Navigate to="/login" replace />} />

            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/help" element={user ? <HelpRequests /> : <Navigate to="/login" replace />} />
            <Route path="/leaderboard" element={<AuthorityLeaderboard />} />

            <Route path="/volunteer-rewards" element={user ? <VolunteerLeaderboard /> : <Navigate to="/login" replace />} />


            <Route path="/explore" element={user ? <Explore /> : <Navigate to="/login" replace />} />

            <Route path="/messages" element={user ? <Messages /> : <Navigate to="/login" replace />} />
            <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" replace />} />
            <Route path="/create" element={user ? <CreatePost /> : <Navigate to="/login" replace />} />


            
            {/* Integrated Dual-Factor Secure Administration Control Center Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/volunteer-admin" element={<VolunteerAdmin />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Existing Platform Pages */}
            <Route path="/complaints" element={<FileComplaint />} />
            <Route path="/approved-complaints" element={<ApprovedComplaints />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/questions" element={<Questions />} />
            
            {/* Fallback Catch-all Route Redirection Map */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* ── Floating Dashboard Tab Controller Dock ── */}
      {isModularHome && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+140px)] w-[92%] max-w-[420px] z-50 px-2">
          <nav className={`flex justify-between items-center p-2 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.15)] transition-all ${
              highVisibility ? 'bg-yellow-400 border-4 border-black' : 'bg-white/90 backdrop-blur-xl border border-white/60'
            }`}>
            <NavButton active={activeTab === 'education'} onClick={() => setActiveTab('education')} icon={<BookOpen size={18} />} label="Learn" highViz={highVisibility} />
            <NavButton active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} icon={<Phone size={18} />} label="Dir" highViz={highVisibility} />
            <NavButton active={activeTab === 'emergency'} onClick={() => setActiveTab('emergency')} icon={<ShieldAlert size={18} />} label="SOS" highViz={highVisibility} />
            <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Bot size={18} />} label="AI Guide" isAI highViz={highVisibility} />
          </nav>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppProvider>
          <AppLayout />
        </AppProvider>
      </SocketProvider>
    </AuthProvider>
  );
}