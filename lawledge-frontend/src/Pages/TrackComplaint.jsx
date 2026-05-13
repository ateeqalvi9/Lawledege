import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import emailjs from '@emailjs/browser';
import Input from "../Components/ui/Input.jsx";
import Button from "../Components/ui/Button.jsx";
import "./TrackComplaint.css";
import Progress from "../Components/ui/Progress.jsx";
import Alert from "../Components/ui/Alert.jsx";
import Toast from "../Components/ui/Toast.jsx";

export default function TrackComplaint() {
  const [searchParams] = useSearchParams();
  const [trackingCode, setTrackingCode] = useState("");
  const [complaint, setComplaint] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setTrackingCode(code);
      handleSearch(code);
    }
  }, [searchParams]);

  async function handleSearch(codeValue) {
    const code = codeValue ?? trackingCode;
    if (!code.trim()) {
      setToast({ type: "error", message: "Please enter a tracking code" });
      return;
    }

    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("tracking_code", code);

    if (error) {
      console.error("Search error:", error);
      setToast({ type: "error", message: "Error searching complaints" });
      setComplaint(null);
    } else if (data && data.length > 0) {
      setComplaint(data[0]);
      setToast({ type: "success", message: "Complaint found" });
    } else {
      setToast({ type: "error", message: "Complaint not found. Check your tracking code." });
      setComplaint(null);
    }
  }

  const stages = ["Pending", "Approved", "Questions", "PDF Generated", "Sent", "Resolved"];

  function getProgressValue(status) {
    const index = stages.indexOf(status);
    return index >= 0 ? (index / (stages.length - 1)) * 100 : 0;
  }

  async function handleMarkResolved() {
    if (!complaint || !complaint.id) return;

    try {
      const { error } = await supabase
        .from("complaints")
      .update({ status: "resolved" })
        .eq("id", complaint.id);

      if (error) throw error;

      setComplaint({ ...complaint, status: "resolved" });
      setToast({ type: "success", message: "Status updated to Resolved." });

      if (complaint.complainant_email) {
        try {
          await emailjs.send(
            'your_emailjs_service_id',
            'your_emailjs_template_id',
            {
              to_email: complaint.complainant_email,
              from_name: 'Lawledge Portal',
              to_name: complaint.complainant_name || 'Complainant',
              subject: `Complaint Resolved - Tracking ID: ${complaint.tracking_code}`,
              message: `Dear ${complaint.complainant_name || 'Valued User'},\n\nWe are pleased to inform you that your complaint (Tracking ID: ${complaint.tracking_code}) has been marked as RESOLVED by the concerned department.\n\nCategory: ${complaint.category}\nResolution Status: Completed\n\nThank you for bringing this matter to our attention. If you have any further concerns, please feel free to file a new complaint.\n\nBest regards,\nLawledge Portal Team`
            },
            'your_emailjs_user_id'
          );
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
        }
      }
    } catch (error) {
      console.error('Failed to mark as resolved:', error);
      setToast({ type: "error", message: "Failed to update status." });
    }
  }

  return (
    <div className="card">
      <h2>Track Complaint</h2>
      <div className="search-bar">
        <Input
          placeholder="Enter Tracking Code"
          value={trackingCode}
          onChange={e => setTrackingCode(e.target.value)}
        />
        <Button onClick={() => handleSearch(trackingCode)}>Search</Button>
      </div>

      {complaint && (
        <div className="complaint-details">
          <p><strong>Complaint:</strong> {complaint.complaint_text}</p>
          <p><strong>Status:</strong> {complaint.status}</p>
          <Progress value={getProgressValue(complaint.status)} />
          <Alert type="info" message={`Complaint is currently ${complaint.status}`} />
          {complaint.status === "approved" && (
            <div style={{marginTop: '1.5rem'}}>
              <Button onClick={handleMarkResolved} style={{backgroundColor: '#10b981', color: 'white'}}>
                Mark as Resolved (Department Action)
              </Button>
              <small style={{display: 'block', marginTop: '0.5rem', color: '#6b7280'}}>
                Click this button once the department has resolved your complaint.
              </small>
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
