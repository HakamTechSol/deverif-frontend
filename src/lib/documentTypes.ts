export const EMPLOYEE_DOCUMENT_TYPES = [
  "Employee Application Form",
  "CV / Resume",
  "Recent Photograph",
  "CNIC / National ID Copy",
  "Passport Copy — if applicable",
  "Educational Certificates",
  "Educational Transcripts / Mark Sheets",
  "Experience Certificates",
  "Previous Employment / Relieving Letter",
  "Reference / Recommendation Letters",
  "Employee Information Form",
  "Employment / Appointment Letter",
  "Job Description",
  "Offer Letter",
  "Employment Contract / Agreement",
  "NDA — Non-Disclosure Agreement",
  "Company Policies Acknowledgment",
  "Code of Conduct Agreement",
  "IT / Computer Usage Policy Acknowledgment",
  "Data Privacy / Confidentiality Agreement",
  "Bank Account / Salary Details",
  "Tax Information / Tax Documents",
  "Emergency Contact Form",
  "Medical / Fitness Certificate — if required",
  "Background Verification Report — if applicable",
  "Police / Character Certificate — if required",
  "Joining / Onboarding Checklist",
  "Employee ID Card Record",
  "Asset Handover Form",
  "Laptop / Computer Handover Form",
  "SIM / Mobile / Other Equipment Handover",
  "Leave Records",
  "Attendance Records",
  "Performance Evaluation Records",
  "Training / Certification Records",
  "Warning / Disciplinary Records — if applicable",
  "Promotion / Salary Revision Letters",
  "Transfer / Department Change Records",
  "Increment Letter",
  "Resignation Letter",
  "Exit Interview Form",
  "Clearance Form",
  "Final Settlement Record",
  "Experience / Service Certificate",
  "Relieving Letter",
  "Company Asset Return Form",
  "Employee File Closing Checklist",
];

export const EMPLOYEE_DOCUMENT_TYPE_OPTIONS = EMPLOYEE_DOCUMENT_TYPES.map((docType) => ({
  value: docType,
  label: docType,
}));

/**
 * Single source of truth for uploadable document file types.
 *
 * These MUST stay in sync with the backend allow-list in
 * backend/src/middleware/uploadDocs.js (isDocumentAllowed). The browser's
 * "accept" attribute is only a filter hint — the server is the real gate — but
 * if the two drift apart users are shown a file dialog that hides files the
 * server would happily accept (or lets them pick files it will reject), which
 * is exactly the "I can't select my .jpg" confusion this list prevents.
 */
export const UPLOADABLE_DOC_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".zip",
] as const;

/** Value for the accept="" attribute of a document file input. */
export const UPLOADABLE_DOC_ACCEPT = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".zip",
].join(",");
