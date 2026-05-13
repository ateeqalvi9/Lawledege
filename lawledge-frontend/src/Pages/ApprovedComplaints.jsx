import { useEffect, useRef, useState } from "react";
import { supabase } from "../api/supabaseClient";
import html2canvas from "html2canvas";
import Button from "../Components/ui/Button.jsx";
import "./ApprovedComplaints.css";

const BOOKMARK_KEY = "approved-complaint-bookmarks";

export default function ApprovedComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [notice, setNotice] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    fetchApprovedComplaints();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    }
  }, [bookmarks]);

  function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));
    return Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = img.onerror = () => resolve();
      });
    }));
  }

  async function fetchApprovedComplaints() {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .in("status", ["approved", "resolved"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch approved complaints", error);
      setNotice({ type: "error", message: "Unable to load approved complaints." });
      setComplaints([]);
    } else {
      setComplaints(data || []);
      setNotice(null);
    }
    setLoading(false);
  }

  function toggleBookmark(id) {
    setBookmarks(prev =>
      prev.includes(id) ? prev.filter(bookmarkId => bookmarkId !== id) : [...prev, id]
    );
    setNotice({ type: "success", message: "Bookmark updated." });
  }

  async function captureCardImage(id) {
    const card = cardRefs.current[id];
    if (!card) return;

    try {
      await waitForImages(card);
      const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `complaint-${id}.png`;
      link.click();

      setNotice({ type: "success", message: "Card image downloaded." });
    } catch (error) {
      console.error("Capture failed", error);
      setNotice({ type: "error", message: "Unable to download the card image." });
    }
  }

  function getComplaintUrl(complaint) {
    const baseUrl = window?.location?.origin || "";
    return `${baseUrl}/track?code=${encodeURIComponent(complaint.tracking_code)}`;
  }

  async function shareCardImage(complaint) {
    const card = cardRefs.current[complaint.id];
    if (!card) return;

    try {
      await waitForImages(card);
      const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to generate image blob");

      const file = new File([blob], `complaint-${complaint.id}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Complaint ${complaint.tracking_code}`,
          text: `${complaint.tracking_code} - ${complaint.complainant_name}`
        });
        setNotice({ type: "success", message: "Card image ready to share." });
        return;
      }
    } catch (error) {
      console.warn("Image sharing via Web Share API failed", error);
    }

    const message = `Check this complaint card:\n${complaint.tracking_code} - ${complaint.complainant_name}\nStatus: Approved\nView on Lawledge: ${getComplaintUrl(complaint)}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function shareFacebook(complaint) {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getComplaintUrl(complaint))}`;
    window.open(url, "_blank", "noopener");
  }

  function shareInstagram(complaint) {
    const shareText = `Approved complaint ${complaint.tracking_code} - copy this URL to share on Instagram.\n${getComplaintUrl(complaint)}`;
    navigator.clipboard.writeText(shareText).then(() => {
      window.open("https://www.instagram.com/", "_blank", "noopener");
      setNotice({ type: "success", message: "Share text copied. Paste it into Instagram." });
    }).catch(() => {
      setNotice({ type: "error", message: "Could not copy share text to clipboard." });
    });
  }

  function copyLink(complaint) {
    const url = getComplaintUrl(complaint);
    navigator.clipboard.writeText(url)
      .then(() => setNotice({ type: "success", message: "Share link copied." }))
      .catch(() => setNotice({ type: "error", message: "Unable to copy link." }));
  }

  function renderEvidencePreview(complaint) {
    if (!complaint.evidence_url) return <div className="evidence-placeholder">No evidence preview</div>;
    const publicUrl = supabase.storage.from("evidence").getPublicUrl(complaint.evidence_url).data.publicUrl;
    const ext = complaint.evidence_url.split('.').pop().toLowerCase();

    if (ext === "pdf") {
      return (
        <div className="evidence-preview pdf-preview">
          <span>PDF Evidence</span>
        </div>
      );
    }

    return (
      <img
        className="evidence-preview"
        src={publicUrl}
        alt="Complaint evidence"
        loading="eager"
        crossOrigin="anonymous"
        onError={e => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className="approved-complaints-page">
      <div className="approved-complaints-header">
        <div>
          <h1>Complaints Filed</h1>
          <p>Browse the latest approved complaints and download, bookmark, or share each complaint card.</p>
        </div>
        <Button onClick={fetchApprovedComplaints} disabled={loading}>
          Refresh
        </Button>
      </div>

      {notice && (
        <div className={`page-notice ${notice.type}`}>{notice.message}</div>
      )}

      {loading ? (
        <div className="loading-state">Loading approved complaints…</div>
      ) : complaints.length === 0 ? (
        <div className="empty-state">No approved complaints are available yet.</div>
      ) : (
        <div className="complaint-grid">
          {complaints.map(complaint => (
            <article
              key={complaint.id}
              className={`complaint-card ${bookmarks.includes(complaint.id) ? "bookmarked" : ""}`}
              ref={el => { if (el) cardRefs.current[complaint.id] = el; }}
            >
              <div className="card-top">
                <div>
                  <span className={`complaint-chip ${complaint.status === "resolved" ? "resolved" : "approved"}`}>
                    {complaint.status === "resolved" ? "Resolved" : "Approved"}
                  </span>
                  <h2>{complaint.complainant_name}</h2>
                  <p className="complaint-owner">{complaint.category || "Complaint"}</p>
                </div>
                <button
                  className={`bookmark-btn ${bookmarks.includes(complaint.id) ? "active" : ""}`}
                  onClick={() => toggleBookmark(complaint.id)}
                  type="button"
                  title={bookmarks.includes(complaint.id) ? "Remove bookmark" : "Bookmark complaint"}
                >
                  {bookmarks.includes(complaint.id) ? "★" : "☆"}
                </button>
              </div>

              <div className="complaint-actions">
                <Button
                  variant="outline"
                  className="icon-btn"
                  onClick={() => captureCardImage(complaint.id)}
                  title="Download card image"
                  aria-label="Download card image"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  className="icon-btn"
                  onClick={() => shareCardImage(complaint)}
                  title="Share on WhatsApp"
                  aria-label="Share on WhatsApp"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m3.732-5.508A9.63 9.63 0 0 0 12 2.25c-5.25 0-9.5 4.25-9.5 9.5 0 1.689.444 3.297 1.232 4.708L2.25 21.75l7.27-1.91a9.47 9.47 0 0 0 4.518 1.147c5.25 0 9.5-4.25 9.5-9.5 0-2.54-1.01-4.91-2.672-6.687"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  className="icon-btn"
                  onClick={() => shareFacebook(complaint)}
                  title="Share on Facebook"
                  aria-label="Share on Facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  className="icon-btn"
                  onClick={() => shareInstagram(complaint)}
                  title="Share on Instagram"
                  aria-label="Share on Instagram"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  className="icon-btn"
                  onClick={() => copyLink(complaint)}
                  title="Copy share link"
                  aria-label="Copy share link"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </Button>
              </div>

              <div className="complaint-details">
                <p><strong>Status:</strong> <span className={`status-badge ${complaint.status?.toLowerCase()}`}>{complaint.status || "Pending"}</span></p>
                <p><strong>Location:</strong> {complaint.location || "Unknown"}</p>
                <p><strong>Severity:</strong> {complaint.severity || "Medium"}</p>
                <p className="complaint-text">{complaint.complaint_text}</p>
                <p><strong>Authority:</strong> {complaint.assigned_authority || "Unassigned"}</p>
                <p><strong>Law Mapping:</strong> {complaint.ppc_mapping || complaint.law_section || "Not mapped"}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
