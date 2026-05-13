import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import "./Leaderboard.css";
import Table from "./ui/Table.jsx";
import Badge from "./ui/Badge.jsx";
import Toast from "./ui/Toast.jsx";

export default function Leaderboard() {
  const [departments, setDepartments] = useState([]);
  const [toast, setToast] = useState(null);

useEffect(() => {
  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from("complaints")
      .select("category");

    if (error) {
      setToast({ type: "error", message: "Failed to load leaderboard" });
    } else {
      // Group and count by category manually
      const counts = {};
      data.forEach(c => {
        if (c.category) {
          counts[c.category] = (counts[c.category] || 0) + 1;
        }
      });

      // Convert to array and sort ascending (least complaints = better rank)
      const sorted = Object.entries(counts)
        .map(([name, complaint_count]) => ({ name, complaint_count }))
        .sort((a, b) => a.complaint_count - b.complaint_count);

      setDepartments(sorted);
    }
  }
  fetchLeaderboard();
}, []);
  return (
    <div className="card leaderboard">
      <h2>Department Leaderboard</h2>
      <Table
        headers={["Rank", "Department", "Complaints"]}
        rows={departments.map((dept, index) => [
          <Badge text={`#${index + 1}`} />,
          dept.name,
          dept.complaint_count
        ])}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
