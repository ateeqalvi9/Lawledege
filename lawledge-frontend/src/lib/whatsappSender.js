import { getComplaintPDFBlob } from "./pdfGenerator";
import emailjs from '@emailjs/browser';

export const DEPARTMENT_DIRECTORY = [
  { name: "WASA Multan",                          phone: "923166461653", email: "wasa.multan@gov.pk" },
  { name: "MEPCO",                                phone: "923166461653", email: "mepco@gov.pk" },
  { name: "CPO / Women Police Station",           phone: "923166461653", email: "cpo.multan@punjabpolice.gov.pk" },
  { name: "SNGPL (Sui Northern Gas)",             phone: "923166461653", email: "sngpl@gov.pk" },
  { name: "MDA / Metropolitan Corp",              phone: "923166461653", email: "mda.multan@gov.pk" },
  { name: "MWMC (Multan Waste Management Co)",    phone: "923166461653", email: "mwmc.multan@gov.pk" },
  { name: "EPA Punjab",                           phone: "923166461653", email: "epa.punjab@gov.pk" },
  { name: "District Consumer Court Multan",       phone: "923166461653", email: "dcc.multan@gov.pk" },
  { name: "Civil Courts Multan",                  phone: "923166461653", email: "civilcourts.multan@gov.pk" },
  { name: "Punjab Healthcare Commission",         phone: "923166461653", email: "phc.punjab@gov.pk" },
  { name: "Directorate of Education Multan",      phone: "923166461653", email: "doe.multan@gov.pk" },
  { name: "PTA / FIA Cyber Crime Wing",           phone: "923166461653", email: "pta.fia@gov.pk" },
  { name: "City Traffic Police Multan",           phone: "923166461653", email: "traffic.multan@punjabpolice.gov.pk" },
  { name: "Punjab Food Authority (PFA)",          phone: "923166461653", email: "pfa.punjab@gov.pk" },
  { name: "Anti-Corruption Establishment (ACE) Punjab", phone: "923166461653", email: "ace.punjab@gov.pk" },
  { name: "Child Protection & Welfare Bureau Multan",   phone: "923166461653", email: "cpwb.multan@gov.pk" },
  { name: "FIA Cyber Crime Wing",                 phone: "923166461653", email: "fia.cyber@gov.pk" },
  { name: "Livestock & Dairy Development Department",   phone: "923166461653", email: "lddd.punjab@gov.pk" },
];

export async function sendComplaintPDFEmail(complaint, authority, lawSection) {
  const deptInfo = DEPARTMENT_DIRECTORY.find(d => d.name === authority);
  if (!deptInfo || !deptInfo.email) {
    alert(`No email found for: ${authority}`);
    return false;
  }

  try {
    const pdfBlob = await getComplaintPDFBlob(complaint, authority, lawSection);
    const pdfFile = new File([pdfBlob], `Complaint_${complaint.tracking_code}.pdf`, { type: 'application/pdf' });

    const serviceId = 'your_emailjs_service_id';
    const templateId = 'your_emailjs_template_id';
    const userId = 'your_emailjs_user_id';

    const templateParams = {
      to_email: deptInfo.email,
      from_name: 'Lawledge Portal',
      to_name: authority,
      subject: `Official Complaint Submission - Tracking ID: ${complaint.tracking_code}`,
      message: `Respected ${authority},\n\nPlease find attached the official complaint report for Tracking ID: ${complaint.tracking_code}.\n\nComplainant: ${complaint.complainant_name}\nCategory: ${complaint.category}\nLaw Section: ${lawSection}\n\nKindly review and take appropriate action.\n\nRegards,\nLawledge Portal Team`,
      attachment: pdfFile
    };

    await emailjs.send(serviceId, templateId, templateParams, userId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    alert('Failed to send email. Please check the console for details.');
    return false;
  }
}

export function handleOfficialSubmissionFlow(complaint) {
  if (!complaint || !complaint.tracking_code) {
    alert("Submission data missing.");
    return;
  }

  const deptInfo = DEPARTMENT_DIRECTORY.find(d => d.name === complaint.assigned_authority);
  if (!deptInfo) {
    alert(`No WhatsApp contact found for: ${complaint.assigned_authority}`);
    return;
  }

  const officialMessage =
    `Respected ${complaint.assigned_authority},\n\n` +
    `*FORMAL COMPLAINT SUBMISSION*\n` +
    `*Tracking ID:* ${complaint.tracking_code}\n` +
    `*Category:* ${complaint.category}\n` +
    `*Submitted By:* ${complaint.complainant_name}\n\n` +
    `Kindly review the attached PDF for full details and take necessary action.\n\n` +
    `Verify: https://lawledgeportal.com/track?code=${complaint.tracking_code}`;

  const whatsappUrl = `https://wa.me/${deptInfo.phone}?text=${encodeURIComponent(officialMessage)}`;
  window.open(whatsappUrl, "_blank");
}
