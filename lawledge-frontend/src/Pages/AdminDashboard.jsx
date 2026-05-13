import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import emailjs from '@emailjs/browser';
// Removed AlertDialog in favor of the specialized ReviewModal
import ReviewModal from "../Components/ReviewModal.jsx";
import Button from "../Components/ui/Button.jsx";
import Table from "../Components/ui/Table.jsx";
import Toast from "../Components/ui/Toast.jsx";
// Make sure this exists, or use the integrated CSS from Phase 3
import "./AdminDashboard.css"; 
import { sendComplaintPDFEmail } from "../lib/whatsappSender";
import { DEPARTMENT_DIRECTORY } from "../lib/whatsappSender"; 

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Fetch data on load
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Supabase error:", error.message);
      setToast({ type: "error", message: "Error connecting to Supabase." });
    } else if (data) {
      setComplaints(data);
      setFiltered(data);
    }
  }

  // Handle Search and Status Filtering
  useEffect(() => {
    let temp = complaints;
    if (activeFilter !== "all") temp = temp.filter(c => c.status === activeFilter);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      temp = temp.filter(c => 
        c.tracking_code?.toLowerCase().includes(lowerSearch) ||
        c.complainant_name?.toLowerCase().includes(lowerSearch)
      );
    }
    setFiltered(temp);
  }, [searchTerm, activeFilter, complaints]);

  // PURGE LOGIC: Deletes both DB Row AND Storage File
  async function handlePurge(id, filePath) {
    if (!confirm("This will permanently delete the complaint record and the evidence. Are you sure?")) return;

    setToast({ type: "loading", message: "Purging data..." });

    // 1. Delete File from Storage
    await supabase.storage.from('evidence').remove([filePath]);

    // 2. Delete Row from DB
    const { error } = await supabase.from("complaints").delete().eq("id", id);

    if (!error) {
      setToast({ type: "success", message: "Complaint record purged." });
      fetchData(); // Refresh table
    } else {
      setToast({ type: "error", message: `Purge failed: ${error.message}` });
    }
    setSelected(null);
  }

  // UPDATE LOGIC: Changes status and sends PDF email
  async function handleApprove(id) {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;

    const { error } = await supabase
      .from("complaints")
      .update({ status: 'approved' })
      .eq("id", id);
    
    if (error) {
      setToast({ type: "error", message: `Approval failed: ${error.message}` });
    } else {
      setToast({ type: "success", message: "Complaint approved. Sending emails to authority and complainant..." });
      
      // Get authority email
      const authorityInfo = DEPARTMENT_DIRECTORY.find(d => d.name === complaint.assigned_authority);
      
      // Send email to authority with PDF
      try {
        await emailjs.send(
          'your_emailjs_service_id',
          'your_emailjs_template_id',
          {
            to_email: authorityInfo?.email || 'admin@lawledge.gov.pk',
            from_name: 'Lawledge Portal',
            to_name: complaint.assigned_authority,
            subject: `Official Complaint - Tracking ID: ${complaint.tracking_code}`,
            message: `Respected ${complaint.assigned_authority},\n\nA complaint has been approved and forwarded to your department for action.\n\nTracking ID: ${complaint.tracking_code}\nComplainant: ${complaint.complainant_name}\nCategory: ${complaint.category}\nLocation: ${complaint.location}\nSeverity: ${complaint.severity}\n\nDetails:\n${complaint.complaint_text}\n\nLaw Section: ${complaint.ppc_mapping || 'General'}\n\nPlease take necessary action and update the status accordingly.\n\nRegards,\nLawledge Portal Team`
          },
          'your_emailjs_user_id'
        );
      } catch (authorityEmailError) {
        console.warn('Failed to send email to authority:', authorityEmailError);
      }

      // Send confirmation email to complainant
      if (complaint.complainant_email) {
        try {
          await emailjs.send(
            'your_emailjs_service_id',
            'your_emailjs_template_id',
            {
              to_email: complaint.complainant_email,
              from_name: 'Lawledge Portal',
              to_name: complaint.complainant_name,
              subject: `Complaint Approved - Tracking ID: ${complaint.tracking_code}`,
              message: `Dear ${complaint.complainant_name},\n\nYour complaint has been APPROVED and forwarded to the concerned authority for immediate action.\n\nTracking ID: ${complaint.tracking_code}\nCategory: ${complaint.category}\nStatus: Approved\n\nThe authority will review your complaint and take appropriate action. You can track the progress at: https://lawledgeportal.com/track?code=${complaint.tracking_code}\n\nThank you for bringing this matter to our attention.\n\nBest regards,\nLawledge Portal Team`
            },
            'your_emailjs_user_id'
          );
        } catch (complainantEmailError) {
          console.warn('Failed to send email to complainant:', complainantEmailError);
        }
      }

      fetchData(); // Refresh table
    }
    setSelected(null);
  }

  return (
    <div className="admin-container">
      {/* PROFESSIONAL STATS GRID */}
      <div className="stats-grid">
        <div className="stat-card"><h3>{complaints.length}</h3><p>Total Complaints</p></div>
        <div className="stat-card"><h3>{complaints.filter(c=>c.status==='pending').length}</h3><p>Pending Action</p></div>
        <div className="stat-card"><h3>{complaints.filter(c=>c.status==='approved').length}</h3><p>Approved</p></div>
      </div>

      <div className="card shadow">
        {/* ENHANCED FILTER BAR */}
        <div className="filter-bar">
          <input 
            className="search-input" 
            placeholder="Search by code or name..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'resolved'].map(status => (
              <Button 
                key={status}
                variant={activeFilter === status ? "primary" : "outline"}
                onClick={() => setActiveFilter(status)}
              >
                {status.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <Table
          headers={["Code", "Name", "Category", "Status", "Actions"]}
          rows={filtered.map(c => [
            <strong>{c.tracking_code}</strong>,
            c.complainant_name,
            c.category,
            <span className={`badge ${c.status || 'pending'}`}>{c.status || 'pending'}</span>,
            <div className="flex gap-2">
              {/* Click triggers the specialized ReviewModal */}
              <Button onClick={() => setSelected(c)}>Review</Button>
            </div>
          ])}
        />
      </div>

      {/* SPECIALIZED MODAL (Fixes the empty modal issue) */}
      <ReviewModal 
        complaint={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onPurge={handlePurge}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}