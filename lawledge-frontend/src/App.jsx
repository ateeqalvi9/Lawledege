import { Routes, Route, Link, useLocation } from "react-router-dom";

// Pages
import Home from "./Pages/Home.jsx";
import FileComplaint from "./Pages/FileComplaint.jsx";
import ApprovedComplaints from "./Pages/ApprovedComplaints.jsx";
import TrackComplaint from "./Pages/TrackComplaint.jsx";
import AdminDashboard from "./Pages/AdminDashboard.jsx";
import Questions from "./Pages/Questions.jsx";

// Components
import Leaderboard from "./Components/Leaderboard.jsx";

import "./App.css";

const NAV_LINKS = [
  { to: "/",                    label: "Home",             icon: "🏠" },
  { to: "/complaints",          label: "File Complaint",   icon: "📝" },
  { to: "/approved-complaints", label: "Complaints",       icon: "✅" },
  { to: "/track",               label: "Track Complaint",  icon: "🔍" },
  { to: "/admin",               label: "Admin Dashboard",  icon: "⚙️" },
  { to: "/leaderboard",         label: "Leaderboard",      icon: "🏆" },
];

function NavLink({ to, label, icon }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      data-icon={icon}
      className={active ? "active" : ""}
      style={active ? {
        background: "var(--lavender)",
        color: "var(--lavender-deep)",
        borderColor: "var(--lavender-mid)",
        transform: "translateX(2px)",
      } : {}}
    >
      {label}
    </Link>
  );
}

function AppLayout() {
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-logo">
          <h2>Lawledge</h2>
          <span>Legal Portal</span>
        </div>
        {NAV_LINKS.map(l => (
          <NavLink key={l.to} {...l} />
        ))}
      </nav>

      <div className="main-wrapper">
        <main className="content">
          <Routes>
            <Route path="/"                     element={<Home />} />
            <Route path="/complaints"           element={<FileComplaint />} />
            <Route path="/approved-complaints"  element={<ApprovedComplaints />} />
            <Route path="/track"                element={<TrackComplaint />} />
            <Route path="/admin"                element={<AdminDashboard />} />
            <Route path="/leaderboard"          element={<Leaderboard />} />
            <Route path="/questions"            element={<Questions />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppLayout />;
}
