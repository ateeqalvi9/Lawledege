import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useState } from "react";
import {
  BookOpen, ShieldAlert, Phone, Bot, Eye, EyeOff,
  Rss, User, ShieldCheck, Film, Compass, MessageSquare,
  Search, Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── PROVIDERS ───────── */
import { AppProvider } from './lib/context.jsx';
import { AuthProvider } from './lib/AuthContext';
import { SocketProvider } from './lib/SocketContext';
import { useAuth, useApp } from './lib/hooks';
import { ThemeProvider } from './lib/ThemeContext';

/* ───────── THEME BUTTON ───────── */
import ThemeToggleButton from "./components/ThemeToggleButton";

/* ───────── MODULES ───────── */
import DirectoryModule from './modules/directory/DirectoryModule';
import EducationModule from './modules/education/FlashcardModule';
import EmergencyHub from './modules/emergency/EmergencyHub';
import { AgentInterface } from './modules/ai-agent';

/* ───────── PAGES ───────── */
import Feed from "./Pages/Feed";
import Profile from "./Pages/Profile";
import Reels from "./Pages/Reels";
import HelpRequests from "./Pages/HelpRequests";
import Leaderboard from "./Components/Leaderboard";
import Explore from "./Pages/Explore";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Messages from "./Pages/Messages";
import Notifications from "./Pages/Notifications";
import AdminDashboard from "./Pages/AdminDashboard";

import FileComplaint from "./Pages/FileComplaint";
import ApprovedComplaints from "./Pages/ApprovedComplaints";
import TrackComplaint from "./Pages/TrackComplaint";
import Questions from "./Pages/Questions";
import CreatePost from "./Components/CreatePost";

import "./App.css";

/* ───────────────── SIDEBAR LINKS ───────────────── */
const SIDEBAR_LINKS = [
  { to: "/", label: "Home Tools", icon: <Bot size={18} /> },
  { to: "/feed", label: "Justice Feed", icon: <Rss size={18} /> },
  { to: "/help", label: "Help Line Hub", icon: <ShieldAlert size={18} /> },
  { to: "/explore", label: "Explore Network", icon: <Compass size={18} /> },
  { to: "/reels", label: "Legal Reels", icon: <Film size={18} /> },
  { to: "/messages", label: "Inbox Chat", icon: <MessageSquare size={18} /> },
  { to: "/complaints", label: "File Complaint", icon: <ShieldCheck size={18} /> },
  { to: "/approved-complaints", label: "Complaints Portal", icon: <BookOpen size={18} /> },
  { to: "/track", label: "Track Complaint", icon: <Search size={18} /> },
  { to: "/leaderboard", label: "Leaderboard", icon: <Trophy size={18} /> },
  { to: "/admin", label: "Admin Dashboard", icon: <ShieldAlert size={18} /> },
  { to: "/profile", label: "My Profile", icon: <User size={18} /> },
];

/* ───────────────── NAV BUTTON ───────────────── */
function NavButton({ active, onClick, icon, label, isAI, highViz }) {
  const activeStyles =
    highViz
      ? "bg-black text-yellow-400 border-2 border-yellow-400 scale-105"
      : isAI
        ? "bg-amber-500 text-white shadow-lg scale-105"
        : "bg-slate-900 text-white scale-105";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2.5 px-4 rounded-2xl transition-all duration-300 flex-1 ${
        active ? activeStyles : "text-slate-400 hover:bg-slate-100"
      }`}
    >
      {icon}
      <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">
        {label}
      </span>
    </button>
  );
}

/* ───────────────── APP SHELL ───────────────── */
function AppShell({ children }) {
  const { highVisibility } = useApp();

  return (
    <div className={`min-h-screen w-full flex bg-slate-50 ${highVisibility ? "high-viz" : ""}`}>
      {children}
    </div>
  );
}

/* ───────────────── LAYOUT ───────────────── */
function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { highVisibility, setHighVisibility } = useApp();
  const [activeTab, setActiveTab] = useState("directory");

  const isHome = pathname === "/";
  const hideNav = ["/login", "/register", "/reels"].some(p =>
    pathname.startsWith(p)
  );

  return (
    <AppShell>
      {/* ───────── SIDEBAR ───────── */}
      {!hideNav && (
        <aside className="w-64 bg-white border-r flex flex-col p-4">

          <div className="mb-6">
            <h2 className="text-xl font-bold">Lawledge</h2>
            <p className="text-xs text-slate-500">Legal Portal</p>
          </div>

          {/* LINKS */}
          <nav className="flex flex-col gap-2">
            {SIDEBAR_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === link.to
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 🔥 THEME TOGGLE (FIXED PLACE) */}
          <div className="mt-4">
            <ThemeToggleButton />
          </div>

          {/* CONTRAST MODE */}
          <button
            onClick={() => setHighVisibility(!highVisibility)}
            className="mt-3 flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs"
          >
            {highVisibility ? <EyeOff size={16} /> : <Eye size={16} />}
            Contrast Mode
          </button>
        </aside>
      )}

      {/* ───────── MAIN ───────── */}
      <main className="flex-1 min-h-screen overflow-x-hidden">
        <div className="p-4 sm:p-6">

          <Routes>

            <Route
              path="/"
              element={
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "education" && <EducationModule />}
                    {activeTab === "directory" && <DirectoryModule />}
                    {activeTab === "emergency" && <EmergencyHub />}
                    {activeTab === "ai" && <AgentInterface />}
                  </motion.div>
                </AnimatePresence>
              }
            />

            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/help" element={<HelpRequests />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/messages" element={user ? <Messages /> : <Navigate to="/login" replace />} />
            <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" replace />} />
            <Route path="/create" element={user ? <CreatePost /> : <Navigate to="/login" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/complaints" element={<FileComplaint />} />
            <Route path="/approved-complaints" element={<ApprovedComplaints />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/questions" element={<Questions />} />

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </div>
      </main>

      {/* ───────── FLOATING DOCK ───────── */}
      {isHome && !hideNav && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-50">
          <div className={`flex p-2 rounded-3xl shadow-xl ${
            highVisibility ? "bg-yellow-400 border-2 border-black" : "bg-white/90 backdrop-blur"
          }`}>

            <NavButton active={activeTab === "education"} onClick={() => setActiveTab("education")} icon={<BookOpen size={18} />} label="Learn" />
            <NavButton active={activeTab === "directory"} onClick={() => setActiveTab("directory")} icon={<Phone size={18} />} label="Dir" />
            <NavButton active={activeTab === "emergency"} onClick={() => setActiveTab("emergency")} icon={<ShieldAlert size={18} />} label="SOS" />
            <NavButton active={activeTab === "ai"} onClick={() => setActiveTab("ai")} icon={<Bot size={18} />} label="AI" isAI />

          </div>
        </div>
      )}

    </AppShell>
  );
}

/* ───────────────── ROOT ───────────────── */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppProvider>
            <AppLayout />
          </AppProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}