import { useState } from "react";
import { supabase } from "../api/supabaseClient";
import Button from "../Components/ui/Button";
import  {saveComplaintPDF}  from "../lib/pdfGenerator";
import "./FileComplaint.css";
import { handleOfficialSubmissionFlow } from "../lib/whatsappSender";
import { 
  MULTAN_ZONES, 
  ISSUE_MAPPING, 
  SEVERITY_LEVELS,
  generateTrackingCode 
} from "../lib/complaintData";

export default function FileComplaint() {
  const [form, setForm] = useState({ 
    userName: "", 
    email: "", 
    category: "", 
    location: "", 
    severity: "Medium", 
    text: "" 
  });
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(null); // Stores full data for PDF/WA

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Evidence is required.");

    setLoading(true);
    const code = generateTrackingCode();
    const mapping = ISSUE_MAPPING[form.category] || { auth: "Admin", law: "General" };
    const finalName = form.userName.trim() || "Anonymous";

    try {
      // 1. Upload File
      const fileExt = file.name.split('.').pop();
      const fileName = `${code}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Prepare Payload
      const complaintPayload = {
        tracking_code: code,
        complainant_name: finalName,
        complainant_email: form.email,
        category: form.category,
        location: form.location,
        severity: form.severity,
        complaint_text: form.text,
        evidence_url: uploadData.path,
        ppc_mapping: mapping.law,
        assigned_authority: mapping.auth
      };

      // 3. Insert to DB
      const { error: dbError } = await supabase.from("complaints").insert([complaintPayload]);

      if (dbError) throw dbError;

      // 4. Update state to enable Success UI and Action Buttons
      setLastSubmission(complaintPayload);
      setTrackingCode(code);
      setSubmitted(true);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- SUCCESS VIEW (Only shows after DB insertion) ---
  if (submitted) return (
    <div className="form-container">
      <div className="success-card shadow">
        <div className="success-icon">✓</div>
        <h2>Complaint Registered!</h2>
        <p className="tracking-text">
          Tracking ID: <strong>{trackingCode}</strong>
        </p>
        
        <div className="info-box">
          <p>Your official complaint has been formatted. Please use the buttons below to download your report and notify the concerned department.</p>
        </div>

<div className="action-row" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
  {/* Option 1: Just Download */}
  <Button 
    className="btn-download" 
    onClick={async () => await saveComplaintPDF(lastSubmission, lastSubmission.assigned_authority, lastSubmission.ppc_mapping)}
  >
    Download PDF
  </Button>

  {/* Option 2: Just WhatsApp */}
<Button 
            className="btn-wa" 
            style={{ width: '100%', backgroundColor: '#25D366', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => handleOfficialSubmissionFlow(lastSubmission)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m3.732-5.508A9.63 9.63 0 0 0 12 2.25c-5.25 0-9.5 4.25-9.5 9.5 0 1.689.444 3.297 1.232 4.708L2.25 21.75l7.27-1.91a9.47 9.47 0 0 0 4.518 1.147c5.25 0 9.5-4.25 9.5-9.5 0-2.54-1.01-4.91-2.672-6.687"/>
            </svg>
            Notify Authority via WhatsApp
          </Button>

</div>

        <button className="btn-reset" onClick={() => window.location.reload()}>
          File Another Complaint
        </button>
      </div>
    </div>
  );

  // --- FORM VIEW ---
  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="complaint-form">
        <div className="form-group">
          <label>Your Information</label>
          <div className="form-row">
            <div style={{flex: 1}}>
              <input type="text" placeholder="Name" onChange={e => setForm({...form, userName: e.target.value})} />
              <small style={{color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem'}}>Optional - Anonymous if not provided</small>
            </div>
            <input type="email" placeholder="Email (Optional)" onChange={e => setForm({...form, email: e.target.value})} />
          </div>
        </div>

        <div className="form-group">
          <label>Incident Details</label>
          <div className="form-row">
            <select required onChange={e => setForm({...form, location: e.target.value})}>
              <option value="">Where did it happen?</option>
              {MULTAN_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>

            <select required onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">What is the issue?</option>
              {Object.keys(ISSUE_MAPPING).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Severity Level</label>
          <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
            {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s} Severity</option>)}
          </select>
          
          <label style={{marginTop: '10px'}}>Detailed Description</label>
          <textarea placeholder="Describe details..." required onChange={e => setForm({...form, text: e.target.value})} />
        </div>

        <div className="form-group evidence-box">
          <label><strong>Upload Evidence (Required)</strong></label>
          <input 
            type="file" 
            accept="image/*,.pdf" 
            required 
            onChange={e => setFile(e.target.files[0])} 
            className="file-input"
          />
          <small>Supported formats: Images and PDFs</small>
        </div>

        <Button type="submit" disabled={loading} style={{width: '100%'}}>
          {loading ? "Processing..." : "Submit Complaint"}
        </Button>
      </form>
    </div>
  );
}