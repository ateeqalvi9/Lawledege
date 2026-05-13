import React from "react";
import "./WhatsAppButton.css";
// Change the import name here to match the file
import { handleOfficialSubmissionFlow } from "../../lib/whatsappSender";

export default function WhatsAppButton({ complaint }) {
  return (
    <button
      className="whatsapp-btn"
      onClick={() => {
        // Guard check: Ensure button only works if a complaint exists
        if (complaint) {
          handleOfficialSubmissionFlow(complaint);
        } else {
          alert("No complaint data found to share.");
        }
      }}
    >
      <img
        src="/icons/whatsapp.png" 
        alt="WhatsApp"
        className="whatsapp-icon"
      />
      Generate PDF & Send
    </button>
  );
}