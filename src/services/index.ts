import { api, type Paginated } from "@/lib/api";

export type UUID = string;

export type Organization = {
  uuid: UUID;
  name: string;
  verified: "yes" | "no";
  organization_type: string;
  business_email?: string | null;
  allowed_ip_addresses?: string[] | null;
  logo?: string | null;
  subscription_status?: "active" | "expired" | "none";
  subscription_start?: string | null;
  subscription_expiry?: string | null;
  subscription_plan_id?: number | null;
  subscription_plan_name?: string | null;
  users_count?: number;
  employees_count?: number;
  requests_count?: number;
  admin_name?: string | null;
  admin_email?: string | null;
  created_at?: string;
};

export type FeatureAccess = {
  attendance: boolean;
  leave: boolean;
  payroll: boolean;
  manage_employees: boolean;
  generate_request: boolean;
  approve_request: boolean;
};

export type FeatureAccessKey = keyof FeatureAccess;

export type UserRecord = {
  uuid: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  cnic?: string | null;
  status: "active" | "inactive";
  org_role?: "employee" | "org_admin" | "sub_admin";
  feature_access?: FeatureAccess | null;
  profile_image?: string | null;
  is_verified?: "yes" | "no";
  created_at?: string;
  organization_uuid?: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  invitation_pending?: boolean;
};

export type MatchStatus =
  | "not_attempted"
  | "auto_matched"
  | "manual_review"
  | "no_reference_found"
  | string;

export type VerificationRequest = {
  uuid: UUID;
  document_type: string;
  issuing_organization_uuid?: string | null;
  issuing_org_name?: string | null;
  unmatched_org_uuid?: string | null;
  unmatched_org_name?: string | null;
  submission_remarks?: string | null;
  document_owner_cnic?: string | null;
  document_owner_name?: string | null;
  has_prior_verification?: boolean;
  prior_verified_at?: string | null;
  verification_remarks?: string | null;
  status: "under_review" | "verified" | "unverified";
  document_path?: string;
  document_format?: string;
  submitted_at: string;
  verified_at?: string | null;
  organization_conserned_for_future?: "yes" | "no";
  verification_method?: string;
  locked_by?: number | null;
  locked_at?: string | null;
  locked_by_uuid?: string | null;
  locked_by_name?: string | null;
  verified_by?: number | null;
  verified_by_uuid?: string | null;
  verified_by_name?: string | null;
  verified_by_email?: string | null;
  requester_uuid?: string;
  requester_name?: string;
  requester_email?: string;
  requester_organization_uuid?: string | null;
  requester_organization?: string | null;
  requester_org_logo?: string | null;
  issuing_org_logo?: string | null;
  qr_token?: string | null;
  /**
   * The public verification link, built server-side by the same helper that
   * stamps the downloadable certificate PDF. Present only when the request
   * carries a QR token.
   *
   * Always render this rather than assembling a URL from a base: the frontend
   * used to keep its own VITE_PUBLIC_BASE_URL copy, which drifted from the
   * backend's QR_VERIFY_BASE_URL and sent people to a different host than the
   * printed certificate did.
   */
  verify_url?: string | null;
  sla_reminder_sent_at?: string | null;
  sla_flagged_at?: string | null;
  match_status?: MatchStatus | null;
  match_confidence?: number | string | null;
  match_mismatch_risk?: boolean | null;
  linked_person_id?: number | null;
  matched_employee_document_id?: number | null;
  matched_document_uuid?: string | null;
  matched_document_name?: string | null;
  matched_document_path?: string | null;
  matched_document_type?: string | null;
  matched_employee_name?: string | null;
  auto_verified?: boolean;
  doc_verification_count?: number | string | null;
  /**
   * Outcome of the automated document check, as recorded by the backend.
   * - "passed": structural checks (parse / truncation / CRC / type agreement) were clean.
   * - "flagged": a HEURISTIC quality check fired (crop detection, darkness /
   *   low-contrast). Tuning-sensitive and possibly a false positive, so the
   *   request was still created rather than blocked.
   * - "unvalidated": the document service was unreachable, so nothing was
   *   actually checked.
   *
   * Not surfaced in the UI — the reviewer is expected to judge the file
   * directly — but kept on the row and exposed here for API consumers and
   * support queries.
   */
  document_validation_status?: "passed" | "flagged" | "unvalidated" | null;
  /** The validator's own message, present when status is "flagged". */
  document_validation_reason?: string | null;
};

/** One ledger entry: a single organization's verification of a person's document. */
export type DocumentVerificationRecord = {
  id: number;
  uuid: UUID;
  document_type?: string | null;
  document_hash?: string | null;
  verified_at?: string | null;
  status: "verified" | "unverified";
  cross_check_status?: "not_checked" | "matched" | "mismatched" | null;
  verified_by_organization_uuid?: string | null;
  verified_by_organization?: string | null;
  verified_by_organization_logo?: string | null;
  verification_request_uuid?: string | null;
  verification_method?: string | null;
};

/** Full cross-organization verification history for one document. */
export type AutoVerifiedHistory = {
  person_uuid?: string | null;
  document_type?: string | null;
  document_owner_name?: string | null;
  total_verifications: number;
  history: DocumentVerificationRecord[];
};

export type UnmatchedOrganization = {
  uuid: UUID;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: "pending" | "contacted" | "converted" | "ignored";
  request_count: number;
  created_at: string;
  assigned_organization?: { uuid: UUID; name: string } | null;
};

export type UnmatchedOrgDetail = {
  organization: UnmatchedOrganization;
  requests: Array<{
    uuid: UUID;
    document_type: string;
    document_format?: string;
    document_path?: string;
status: "under_review" | "verified" | "unverified";
    submitted_at: string;
    verified_at?: string | null;
    submission_remarks?: string | null;
    verification_remarks?: string | null;
    verification_method?: string;
    locked_by?: number | null;
    locked_at?: string | null;
    locked_by_name?: string | null;
    requester_name?: string;
    requester_email?: string;
    requester_org_uuid?: string | null;
  }>;
};

export type AdminUserRecord = UserRecord;

export type EmployeeRecord = {
  uuid: UUID;
  organization_id: number;
  organization_uuid?: UUID | null;
  organization_name?: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  cnic: string;
  designation: string | null;
  department: string | null;
  status: "active" | "inactive" | "resigned" | "terminated";
  record_type?: "roster" | "learned_reference";
  is_platform_user: "yes" | "no";
  joining_date?: string | null;
  emergency_contact?: string | null;
  document_count?: number;
  current_salary?: string | number | null;
  linked_user_uuid?: UUID | null;
  linked_user_email?: string | null;
  linked_user_profile_image?: string | null;
  added_by_uuid?: UUID | null;
  added_by_name?: string | null;
  promoted_by_uuid?: UUID | null;
  promoted_by_name?: string | null;
  promoted_at?: string | null;
  created_at: string;
  linked_user_status?: "active" | "inactive" | null;
  linked_user_role?: "employee" | "org_admin" | "sub_admin" | null;
  feature_access?: string | FeatureAccess | null;
  invite_sent_at?: string | null;
  invite_expires_at?: string | null;
  invite_used_at?: string | null;
};

export type EmployeeDocument = {
  uuid: UUID;
  employee_uuid: UUID;
  document_type: string | null;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  uploaded_at?: string | null;
  created_at: string;
  document_hash?: string | null;
  document_extracted_name?: string | null;
  document_extracted_cnic_hash?: string | null;
  match_status?: string | null;
};

export type ManagedOption = { uuid: UUID; name: string };

export type OrgUserRecord = {
  uuid: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  cnic?: string | null;
  status: "active" | "inactive";
  org_role: "employee" | "org_admin" | "sub_admin";
  feature_access?: FeatureAccess | null;
  created_at?: string;
  employee_uuid?: UUID | null;
  designation?: string | null;
  department?: string | null;
};

export type OrgAdminUserRecord = {
  uuid: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  cnic?: string | null;
  status: "active" | "inactive";
  org_role: "org_admin" | "sub_admin";
  feature_access?: FeatureAccess | null;
  created_at?: string;
  /**
   * 'no' until the invitee sets a password, 'yes' afterwards. The org sub-admin
   * list is only allowed to offer Cancel Invitation / Remove Permanently while
   * this is 'no' — same rule the platform /admin/users list follows.
   */
  is_verified?: "yes" | "no";
  /** True while an unused invite token exists, i.e. a link that still works. */
  invitation_pending?: boolean;
};

export type Payment = {
  uuid: UUID;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  purpose: string;
  paid_at?: string;
  created_at?: string;
  user_uuid?: string;
  full_name?: string;
  email?: string;
};

export type PlanSummary = {
  /** "free" | "paid" — derived from the plan's is_free flag, never its name. */
  code: string;
  label: string | null;
  is_free: boolean;
  plan_name: string | null;
  plan_uuid: string | null;
  expires_at: string | null;
  has_expiry: boolean;
  is_expired: boolean;
  is_active: boolean;
  status: string;
};

export type PlanFeature = {
  text: string;
  highlight?: boolean;
};

export type OrgSubscription = {
  status: "active" | "expired" | "none" | "pending_payment";
  plan: "monthly" | "yearly" | null;
  plan_name: string | null;
  /**
   * Whether the current plan is the Free plan. Every organization is always on
   * a real plan (Free by default), and Free is identified by this flag alone --
   * never by a name match or a zero price. A Free plan has no expiry, so
   * `expiry === null` means "indefinite" for it rather than "expired".
   */
  is_free?: number | boolean | null;
  plan_uuid?: string | null;
  monthly_price: number | null;
  daily_request_quota: number | null;
  description?: string | null;
  features?: PlanFeature[];
  module_flags?: ModuleFlags | null;
  expiry: string | null;
  start: string | null;
  /**
   * A SCHEDULED plan change: buying the same plan again (a renewal) or a
   * lower-tier plan while the current period is still running parks the new plan
   * here instead of switching immediately. The change is applied automatically
   * when `pending_plan_effective_at` passes, and can be cancelled with a refund
   * before then.
   *
   * `pending_plan_name` equal to `plan_name` means it is a RENEWAL rather than a
   * downgrade — the same one mechanism, two meanings, distinguished by whether the
   * plan actually changes.
   */
  pending_plan_id?: number | null;
  pending_plan_name?: string | null;
  pending_plan_daily_request_quota?: number | null;
  pending_plan_monthly_price?: number | null;
  pending_plan_effective_at?: string | null;
} | null;

export type QuotaStatus = {
  date: string;
  free_daily_requests: number;
  plan_quota: number;
  total_allowance: number;
  requests_used: number;
  total_requests: number;
  requests_remaining: number;
  plan: {
    uuid: string | null;
    name: string | null;
    daily_request_quota: number;
  } | null;
};

export type CustomPlanRequest = {
  uuid: UUID;
  message: string | null;
  requested_quota: number | null;
  requested_price: number | null;
  status: "pending" | "approved" | "denied";
  approved_daily_quota: number | null;
  approved_price: number | null;
  created_at?: string;
  decided_at?: string | null;
  decided_by?: string | null;
  requested_by_name?: string | null;
  requested_by_email?: string | null;
  organization_uuid?: string | null;
  organization_name?: string | null;
  organization_id?: number | null;
  /**
   * The plan this approval created, and the edge that makes it payable. NULL
   * means the System Admin approved the terms but no plan could be linked, in
   * which case there is nothing to pay for and the UI must not offer to pay.
   */
  approved_plan_id?: number | null;
  approved_plan_uuid?: UUID | null;
  approved_plan_name?: string | null;
  approved_plan_monthly_price?: number | null;
};

export type SelfSubscriptionRequest = {
  uuid: UUID;
  amount: number | null;
  status: "pending" | "confirmed" | "cancelled";
  created_at?: string;
  decided_at?: string | null;
  decided_by?: string | null;
  organization_uuid?: string | null;
  organization_name?: string | null;
  subscription_status?: string | null;
  plan_uuid?: string | null;
  plan_name?: string | null;
  monthly_price?: number | null;
  daily_request_quota?: number | null;
  billing_period?: string | null;
  requested_by_name?: string | null;
  requested_by_email?: string | null;
  organization_id?: number | null;
};

export type ModuleFlags = {
  employee_management: boolean;
  attendance_management: boolean;
  user_management: boolean;
  leave_management: boolean;
  payroll_management: boolean;
};

/**
 * Machine-readable error codes the API returns. The two that matter here both
 * arrive as a 403 but need completely different UI:
 *
 *   SUBSCRIPTION_INACTIVE - no valid subscription at all. Rare: every org is
 *                           always on a plan (Free by default). Reserved for a
 *                           corrupted or lapsed state.
 *   UPGRADE_REQUIRED     - the subscription is valid, this plan just does not
 *                           include the module. Render an "upgrade" prompt that
 *                           can open the plan chooser, NOT a dead-subscription
 *                           banner.
 */
export type ApiErrorCode = "SUBSCRIPTION_INACTIVE" | "UPGRADE_REQUIRED" | string;

/** A 403 body carrying a code plus module context. */
export type ApiErrorBody = {
  success: false;
  message: string;
  code?: ApiErrorCode;
  module?: keyof ModuleFlags;
  module_label?: string;
  can_retry?: boolean;
};

/**
 * True when this 403 means "your plan does not include X" rather than "your
 * subscription is broken". Lets any page branch on the real cause instead of
 * showing the same generic banner for both.
 */
export function isUpgradeRequiredError(e: unknown): boolean {
  const body = (e as { response?: { data?: ApiErrorBody } })?.response?.data;
  return body?.code === "UPGRADE_REQUIRED";
}

/** The module an UPGRADE_REQUIRED error refers to, if any. */
export function upgradeRequiredModule(e: unknown): keyof ModuleFlags | null {
  const body = (e as { response?: { data?: ApiErrorBody } })?.response?.data;
  if (body?.code !== "UPGRADE_REQUIRED") return null;
  return (body.module as keyof ModuleFlags) ?? null;
}

/**
 * The five org-scoped HR modules (+ human labels) that a plan's module_flags
 * toggles. Order matters: it drives both the create/edit modal and the list
 * indicator.
 */
export const MODULE_FEATURES: { key: keyof ModuleFlags; label: string }[] = [
  { key: "employee_management", label: "Employee Management" },
  { key: "attendance_management", label: "Attendance Management" },
  { key: "user_management", label: "User Management" },
  { key: "leave_management", label: "Leave Management" },
  { key: "payroll_management", label: "Payroll Management" },
];

export const ALL_MODULE_FLAGS_ON: ModuleFlags = Object.fromEntries(
  MODULE_FEATURES.map((m) => [m.key, true]),
) as ModuleFlags;

export type SubscriptionPlan = {
  uuid: UUID;
  id?: number;
  name: string;
  monthly_price: number;
  daily_request_quota: number;
  description?: string | null;
  features?: PlanFeature[];
  billing_period: "monthly" | "yearly";
  is_public?: number;
  is_custom?: number;
  is_free?: number;
  is_recommended?: number;
  module_flags?: ModuleFlags | null;
  created_at?: string;
};

export type SubscriptionCheckout = {
  id?: number;
  uuid: UUID;
  status: "pending" | "completed" | "failed" | "cancelled" | "expired";
  amount?: number | null;
  currency?: string | null;
  plan_uuid?: string | null;
  plan_name?: string | null;
  gateway?: string | null;
  gateway_tracker_id?: string | null;
  gateway_event_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  organization_uuid?: string | null;
  organization_name?: string | null;
  subscription_status?: string | null;
  subscription_expiry?: string | null;
};

export type SubscriptionStatusResponse = {
  subscription: OrgSubscription;
  checkout: SubscriptionCheckout | null;
};

export type PaymentProvider = { code: string; label: string };
export type PurchasablePlan = {
  code: string;
  label: string;
  amount: number;
  duration_days: number;
};

export type DashboardStats = {
  total_users?: number;
  total_organizations?: number;
  total_verification_requests?: number;
  total_admin_requests?: number;
  active_users?: number;
  verified_organizations?: number;
  verified_requests?: number;
  unverified_requests?: number;
  under_review_requests?: number;
  users_progress?: number;
  organizations_progress?: number;
  requests_progress?: number;
  unmatched_progress?: number;
  upcoming_expirations?: Array<{
    uuid: string;
    name: string;
    subscription_expiry: string;
  }>;
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const authService = {
  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    api
      .post<{
        token: string;
        user: {
          uuid: string;
          full_name: string;
          email: string;
          profile_image?: string | null;
          role: "admin" | "user";
          org_role?: "employee" | "org_admin" | "sub_admin";
          feature_access?: string | FeatureAccess | null;
          preferred_language?: "en" | "ur";
        };
        requiresOtp?: boolean;
        identity_type?: string;
        identity_id?: string;
        email?: string;
        full_name?: string;
        profile_image?: string | null;
        rememberMe?: boolean;
      }>("/auth/login", data)
      .then((r) => r.data),
  verifyOtp: (data: {
    identity_type: string;
    identity_id: string;
    otp: string;
    rememberMe?: boolean;
  }) =>
    api
      .post<{
        token: string;
        user: {
          uuid: string;
          full_name: string;
          email: string;
          profile_image?: string | null;
          role: "admin" | "user";
          org_role?: "employee" | "org_admin" | "sub_admin";
          feature_access?: string | FeatureAccess | null;
          preferred_language?: "en" | "ur";
        };
      }>("/auth/verify-otp", data)
      .then((r) => r.data),
  resendOtp: (data: { identity_type: string; identity_id: string }) =>
    api.post("/auth/resend-otp", data).then((r) => r.data),
  adminLogin: (data: { email: string; password: string; rememberMe?: boolean }) =>
    api
      .post<{
        requiresOtp?: boolean;
        identity_type?: string;
        identity_id?: string;
        email?: string;
        full_name?: string;
        profile_image?: string | null;
        rememberMe?: boolean;
        token?: string;
        admin?: { uuid: string; email: string; full_name: string; profile_image?: string | null; preferred_language?: "en" | "ur" };
      }>("/admin/auth/login", data)
      .then((r) => r.data),
  adminVerifyOtp: (data: { identity_id: string; otp: string; rememberMe?: boolean }) =>
    api
      .post<{
        token: string;
        admin: { uuid: string; email: string; full_name: string; profile_image?: string | null; preferred_language?: "en" | "ur" };
      }>("/admin/auth/verify-otp", data)
      .then((r) => r.data),
  adminResendOtp: (data: { identity_id: string }) =>
    api.post("/admin/auth/resend-otp", data).then((r) => r.data),
  adminForgotPassword: (email: string) =>
    api.post("/admin/auth/forgot-password", { email }).then((r) => r.data),
  adminResetPassword: (token: string, newPassword: string) =>
    api.post("/admin/auth/reset-password", { token, newPassword }).then((r) => r.data),
  refresh: () => api.post<{ accessToken: string }>("/auth/refresh").then((r) => r.data),
  userLogout: () => api.post("/auth/user/logout").then((r) => r.data),
  adminLogout: () => api.post("/admin/auth/logout").then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post("/auth/user/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/user/reset-password", { token, newPassword }).then((r) => r.data),
  setPassword: (token: string, newPassword: string) =>
    api.post("/auth/user/set-password", { token, newPassword }).then((r) => r.data),
  validateInvite: (token: string) =>
    api
      .get<{ valid: boolean; reason?: "not_found" | "used" | "expired" }>("/auth/user/invite-status", {
        params: { token },
      })
      .then((r) => r.data),
  me: () => api.get<{ user: UserRecord }>("/users/me").then((r) => r.data.user),
  adminMe: () =>
    api
      .get<{
        admin: {
          uuid: string;
          email: string;
          full_name: string;
          phone?: string;
          profile_image?: string;
        };
      }>("/admin/auth/me")
      .then((r) => r.data.admin),
  updateProfile: (form: FormData) =>
    api.patch<{ user: UserRecord }>("/users/me", form).then((r) => r.data.user),
  setPreferredLanguage: (language: "en" | "ur") =>
    api
      .patch<{ preferred_language: "en" | "ur" }>("/users/preferred-language", { language })
      .then((r) => r.data),
  setAdminPreferredLanguage: (language: "en" | "ur") =>
    api
      .patch<{ preferred_language: "en" | "ur" }>("/admin/auth/me/preferred-language", { language })
      .then((r) => r.data),
  updateAdminProfile: (
    data:
      FormData | { full_name?: string; phone?: string; password?: string; old_password?: string },
  ) =>
    api
      .patch<{
        admin: {
          uuid: string;
          email: string;
          full_name: string;
          phone?: string;
          profile_image?: string;
        };
      }>("/admin/auth/profile", data)
      .then((r) => r.data.admin),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ VERIFICATION REQUESTS (user) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const requestsService = {
  organizations: () =>
    api
      .get<{ items: Organization[] }>("/verification-requests/organizations")
      .then((r) => r.data.items),
  create: (form: FormData) =>
    api
      .post<{ request: VerificationRequest }>("/verification-requests", form)
      .then((r) => r.data.request),
  mySent: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/sent", { params })
      .then((r) => r.data),
  deleteSent: (uuid: UUID) =>
    api.delete(`/verification-requests/my/sent/${uuid}`).then((r) => r.data),
  updateSent: (uuid: UUID, form: FormData) =>
    api
      .put<{ request: VerificationRequest }>(`/verification-requests/my/sent/${uuid}`, form)
      .then((r) => r.data.request),
  myInbox: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/inbox", { params })
      .then((r) => r.data),
  myInboxCount: () =>
    api.get<{ count: number }>("/verification-requests/my/inbox/count").then((r) => r.data.count),
  myAutoVerified: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/auto-verified", { params })
      .then((r) => r.data),
  autoVerifiedHistory: (uuid: UUID) =>
    api
      .get<AutoVerifiedHistory>(`/verification-requests/my/auto-verified/${uuid}/history`)
      .then((r) => r.data),
  requestDetail: (uuid: UUID) =>
    api
      .get<{ request: VerificationRequest }>(`/verification-requests/my/inbox/${uuid}`)
      .then((r) => r.data.request),
  verify: (
    uuid: UUID,
    data: {
      status: "verified" | "unverified";
      verification_remarks: string;
    },
  ) =>
    api
      .patch<{ request: VerificationRequest }>(`/verification-requests/${uuid}/verify`, data)
      .then((r) => r.data.request),
  downloadCertificate: async (uuid: UUID) => {
    const r = await api.get(`/verification-requests/${uuid}/certificate`, {
      responseType: "blob",
    });
    return r.data as Blob;
  },
};

export type PublicVerification = {
  valid: boolean;
  status: "verified";
  document_type: string;
  /** The document owner's name as captured on the request. */
  person_name: string | null;
  /** CNIC with everything but the last 4 digits masked, e.g. "*****-****234-3". */
  cnic_masked: string | null;
  organization_name: string | null;
  verification_date: string | null;
  /** Short human-readable code, e.g. "7K2M-9XQ4P". Stable for a certificate. */
  certificate_code: string | null;
  request_reference: string;
  /** What the stored file actually is, from a server-side extension allowlist. */
  file_type: "pdf" | "image" | "docx" | null;
  /** False when the server is not serving previews (PUBLIC_VERIFY_SHOW_DOCUMENT). */
  document_available: boolean;
  /**
   * SHA-256 of the original file, for pdf/image only. Null for every other
   * format and whenever the deployment disables previews — "Check your copy"
   * hides itself when this is null rather than showing a comparison that can
   * only fail.
   */
  document_hash: string | null;
};

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "/api/v1";

export const verifyService = {
  verify: (qrToken: string) =>
    api.get<PublicVerification>(`/verify/${qrToken}`).then((r) => r.data),

  /**
   * Absolute URL of the public document stream. The browser fetches this
   * directly (it is unauthenticated and the token IS the credential), so it is
   * built here rather than going through the axios instance's auth interceptor.
   */
  documentUrl: (qrToken: string) => `${API_BASE}/verify/${encodeURIComponent(qrToken)}/document`,

  /**
   * Fetch the document as a blob. Used for DOCX, which the page renders
   * client-side; PDF and image are shown straight from the URL so the browser's
   * own viewer does the work.
   */
  documentBlob: async (qrToken: string): Promise<Blob> => {
    const res = await fetch(verifyService.documentUrl(qrToken), {
      credentials: "omit",
    });
    if (!res.ok) throw new Error(`Document request failed (${res.status})`);
    return res.blob();
  },
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PAYMENTS (user) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const paymentService = {
  providers: () =>
    api
      .get<{ providers: PaymentProvider[]; plans: PurchasablePlan[] }>("/payment/providers")
      .then((r) => r.data),
  initiate: (data: { provider: string; plan: string; purpose?: string }) =>
    api
      .post<{
        payment: {
          action_url: string;
          method: string;
          fields: Record<string, string>;
          transaction_reference: string;
          amount: number;
          provider: string;
          provider_label: string;
        };
        plan: PurchasablePlan;
      }>("/payment/initiate", data)
      .then((r) => r.data),
  plan: () =>
    api
      .get<{
        plan: PlanSummary;
        org_subscription: OrgSubscription;
        quota_status: QuotaStatus | null;
        payments: Payment[];
      }>("/payment/plan")
      .then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUBSCRIPTION (org side: quota + custom plan) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const orgSubscriptionService = {
  quota: () => api.get<QuotaStatus>("/org/subscription/quota").then((r) => r.data),
  customPlanRequests: () =>
    api
      .get<{ items: CustomPlanRequest[] }>("/org/subscription/custom-plan-requests")
      .then((r) => r.data.items),
  requestCustomPlan: (data: { message?: string; requested_quota: number; requested_price?: number | null }) =>
    api
      .post<{ request: CustomPlanRequest }>("/org/subscription/custom-plan-requests", data)
      .then((r) => r.data.request),
  selfSubscribe: (planUuid: UUID, amount?: number) =>
    api
      .post<{ subscription: OrgSubscription }>("/org/subscription/self-subscribe", { plan_uuid: planUuid, amount })
      .then((r) => r.data.subscription),
  checkout: (planUuid: UUID, purpose?: "subscribe" | "change_plan") =>
    api
      .post<{ checkout: SubscriptionCheckout; redirect_url: string }>("/org/subscription/checkout", {
        plan_uuid: planUuid,
        purpose,
      })
      .then((r) => r.data),
  /**
   * Pay for an APPROVED custom plan.
   *
   * Deliberately not `checkout(planUuid)`: that endpoint only accepts public,
   * non-custom plans, and a custom plan is never public because its price was
   * negotiated. So this is the only way to act on an approved custom-plan
   * request, and the plan is activated by paying — approval alone grants nothing.
   */
  customPlanCheckout: (customPlanRequestUuid: UUID) =>
    api
      .post<{ checkout: SubscriptionCheckout; redirect_url: string }>(
        "/org/subscription/custom-plan/checkout",
        { custom_plan_request_uuid: customPlanRequestUuid }
      )
      .then((r) => r.data),
  checkoutStatus: (checkoutId: UUID) =>
    api
      .get<{ checkout: SubscriptionCheckout }>(`/org/subscription/checkout/${checkoutId}`)
      .then((r) => r.data.checkout),
  subscriptionStatus: () =>
    api
      .get<SubscriptionStatusResponse>("/org/subscription/status")
      .then((r) => r.data),
  /**
   * Cancel a deferred downgrade before it takes effect (clears pending_plan_id).
   * The org stays on its current plan.
   */
  cancelPendingPlan: () =>
    api
      .delete<SubscriptionStatusResponse>("/org/subscription/pending-plan")
      .then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MARKETING (public, unauthenticated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const marketingService = {
  listPlans: () =>
    api
      .get<{ items: SubscriptionPlan[] }>("/marketing/plans")
      .then((r) => r.data.items),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ADMIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type AdminSidebarCounts = { leads: number; support_tickets: number; custom_plan_requests: number; unmatched_requests: number };

export const adminService = {
  sidebarCounts: () => api.get<AdminSidebarCounts>("/admin/sidebar-counts").then((r) => r.data),
  users: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<AdminUserRecord>>("/admin/users", { params }).then((r) => r.data),
  createUser: (form: FormData) =>
    api
      .post<{ user: AdminUserRecord; _email_warning?: string }>("/admin/users", form)
      .then((r) => r.data),
  updateUser: (uuid: UUID, data: Record<string, unknown>) =>
    api.put<{ user: AdminUserRecord }>(`/admin/users/${uuid}`, data).then((r) => r.data.user),
  deleteUser: (uuid: UUID) => api.delete(`/admin/users/${uuid}`).then((r) => r.data),
  cancelInvite: (uuid: UUID) => api.delete(`/admin/users/${uuid}/cancel-invite`).then((r) => r.data),
  resendInvite: (uuid: UUID) => api.post(`/admin/users/${uuid}/resend-invite`).then((r) => r.data),

  organizations: (params: { page?: number; limit?: number; search?: string; without_admin?: boolean } = {}) =>
    api.get<Paginated<Organization>>("/admin/organizations", { params }).then((r) => r.data),
  organizationTypes: () =>
    api.get<{ items: { id: number; name: string }[] }>("/admin/organization-types").then((r) => r.data.items),
  createOrganizationType: (name: string) =>
    api
      .post<{ organization_type: { id: number; name: string } }>("/admin/organization-types", { name })
      .then((r) => r.data.organization_type),
  deleteOrganizationType: (id: number) =>
    api.delete(`/admin/organization-types/${id}`).then((r) => r.data),
  createOrganization: (form: FormData) =>
    api
      .post<{ organization: Organization }>("/admin/organizations", form)
      .then((r) => r.data.organization),
  updateOrganization: (uuid: UUID, form: FormData) =>
    api
      .put<{ organization: Organization }>(`/admin/organizations/${uuid}`, form)
      .then((r) => r.data.organization),
  deleteOrganization: (uuid: UUID) =>
    api.delete(`/admin/organizations/${uuid}`).then((r) => r.data),
  setOrganizationSubscription: (
    uuid: UUID,
    data: { plan?: "monthly" | "yearly"; plan_uuid?: string; amount?: number },
  ) =>
    api
      .patch<{ organization: Organization }>(`/admin/organizations/${uuid}/subscription`, data)
      .then((r) => r.data),
  cancelOrganizationSubscription: (uuid: UUID) =>
    api
      .delete<{ organization: Organization }>(`/admin/organizations/${uuid}/subscription`)
      .then((r) => r.data),

  requests: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api
      .get<Paginated<VerificationRequest>>("/admin/verification-requests", { params })
      .then((r) => r.data),
  nullOrgRequests: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api
      .get<Paginated<UnmatchedOrganization>>("/admin/verification-requests/null-organization", {
        params,
      })
      .then((r) => r.data),
  unmatchedOrgDetail: (uuid: UUID) =>
    api
      .get<UnmatchedOrgDetail>(`/admin/verification-requests/null-organization/${uuid}`)
      .then((r) => r.data),
  adminVerifyUnmatchedRequest: (
    uuid: UUID,
    data: { status: "verified" | "unverified"; verification_remarks: string },
  ) =>
    api
      .patch<{ request: VerificationRequest }>(
        `/admin/verification-requests/null-organization/${uuid}/verify`,
        data,
      )
      .then((r) => r.data.request),
  acceptRequest: (
    uuid: UUID,
    data: { verification_remarks: string; issuing_organization_uuid: UUID },
  ) =>
    api
      .patch<{ unmatched_org: UnmatchedOrganization }>(
        `/admin/verification-requests/${uuid}/accept`,
        data,
      )
      .then((r) => r.data.unmatched_org),
  lockRequest: (uuid: UUID) =>
    api
      .patch<{ request: VerificationRequest }>(`/admin/verification-requests/${uuid}/lock`)
      .then((r) => r.data.request),
  unlockRequest: (uuid: UUID) =>
    api
      .patch<{ request: VerificationRequest }>(`/admin/verification-requests/${uuid}/unlock`)
      .then((r) => r.data.request),
  deleteRequest: (uuid: UUID) =>
    api.delete(`/admin/verification-requests/${uuid}`).then((r) => r.data),
  slaRequests: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api
      .get<Paginated<VerificationRequest>>("/admin/verification-requests/sla", { params })
      .then((r) => r.data),
  slaVerify: (
    uuid: UUID,
    data: { status: "verified" | "unverified"; verification_remarks: string },
  ) =>
    api
      .patch<{ request: VerificationRequest }>(`/admin/verification-requests/sla/${uuid}`, data)
      .then((r) => r.data.request),

  payments: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      method?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ) => api.get<Paginated<Payment>>("/admin/payment", { params }).then((r) => r.data),
  createPayment: (data: {
    user_uuid: UUID;
    amount: number;
    payment_method: "jazzcash" | "easypaisa" | "manual";
    transaction_reference: string;
    purpose: string;
  }) => api.post<{ payment: Payment }>("/admin/payment", data).then((r) => r.data.payment),

  customPlanRequests: (params: { status?: "pending" | "approved" | "denied"; page?: number; limit?: number } = {}) =>
    api
      .get<Paginated<CustomPlanRequest>>("/admin/subscription/custom-plan-requests", { params })
      .then((r) => r.data),
  approveCustomPlanRequest: (uuid: UUID, data: { daily_quota: number; price: number }) =>
    api
      .post<{ request: CustomPlanRequest; plan: { uuid: UUID; name: string; monthly_price: number; daily_request_quota: number } }>(
        `/admin/subscription/custom-plan-requests/${uuid}/approve`,
        data,
      )
      .then((r) => r.data),
  denyCustomPlanRequest: (uuid: UUID) =>
    api
      .post<{ request: CustomPlanRequest }>(`/admin/subscription/custom-plan-requests/${uuid}/deny`)
      .then((r) => r.data),

  selfSubscriptionRequests: (params: { status?: "pending" | "confirmed" | "cancelled"; page?: number; limit?: number } = {}) =>
    api
      .get<Paginated<SelfSubscriptionRequest>>("/admin/subscription/self-subscription-requests", { params })
      .then((r) => r.data),
  subscriptionCheckouts: (params: { status?: string; page?: number; limit?: number } = {}) =>
    api
      .get<Paginated<SubscriptionCheckout>>("/admin/subscription/checkouts", { params })
      .then((r) => r.data),
  confirmSelfSubscriptionRequest: (uuid: UUID, data: { amount?: number } = {}) =>
    api
      .post<{ request: SelfSubscriptionRequest }>(`/admin/subscription/self-subscription-requests/${uuid}/confirm`, data)
      .then((r) => r.data),
  cancelSelfSubscriptionRequest: (uuid: UUID) =>
    api
      .post<{ request: SelfSubscriptionRequest }>(`/admin/subscription/self-subscription-requests/${uuid}/cancel`)
      .then((r) => r.data),

  plans: (params: { public?: number } = {}) =>
    api.get<{ items: SubscriptionPlan[] }>("/admin/plans", { params }).then((r) => r.data),
  createPlan: (data: Partial<SubscriptionPlan>) =>
    api.post<{ plan: SubscriptionPlan }>("/admin/plans", data).then((r) => r.data.plan),
  updatePlan: (uuid: UUID, data: Partial<SubscriptionPlan>) =>
    api.put<{ plan: SubscriptionPlan }>(`/admin/plans/${uuid}`, data).then((r) => r.data.plan),
  togglePlanPublic: (uuid: UUID, isPublic: boolean) =>
    api
      .post<{ plan: SubscriptionPlan }>(`/admin/plans/${uuid}/publish`, { is_public: isPublic })
      .then((r) => r.data.plan),
  deletePlan: (uuid: UUID) =>
    api.delete<{ uuid: UUID }>(`/admin/plans/${uuid}`).then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ORG-ADMIN (org-scoped) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const orgService = {
  employees: (params: { page?: number; limit?: number; search?: string; reference?: boolean } = {}) =>
    api.get<Paginated<EmployeeRecord>>("/org/employees", { params }).then((r) => r.data),
  getEmployee: (uuid: UUID) =>
    api.get<{ employee: EmployeeRecord }>(`/org/employees/${uuid}`).then((r) => r.data.employee),
  createEmployee: (data: Record<string, unknown>) =>
    api
      .post<{ employee: EmployeeRecord; _email_warning?: string }>("/org/employees", data)
      .then((r) => r.data),
  createReference: (data: { full_name: string; cnic: string }) =>
    api.post<{ employee: EmployeeRecord }>("/org/employees/reference", data).then((r) => r.data.employee),
  createReferenceEmployee: (data: { full_name: string; cnic: string }) =>
    api.post<{ employee: EmployeeRecord }>("/org/employees/reference", data).then((r) => r.data.employee),
  updateEmployee: (uuid: UUID, data: Record<string, unknown>) =>
    api
      .put<{ employee: EmployeeRecord }>(`/org/employees/${uuid}`, data)
      .then((r) => r.data.employee),
  deleteEmployee: (uuid: UUID) => api.delete(`/org/employees/${uuid}`).then((r) => r.data),
  archiveReference: (uuid: UUID) =>
    api.post<{ employee: EmployeeRecord }>(`/org/employees/${uuid}/archive-reference`).then((r) => r.data.employee),
  resendInvite: (uuid: UUID) =>
    api.post<{ message?: string }>(`/org/employees/${uuid}/resend-invite`).then((r) => r.data),
  departments: {
    list: () => api.get<{ items: ManagedOption[] }>("/org/departments").then((r) => r.data.items),
    create: (name: string) =>
      api.post<ManagedOption>("/org/departments", { name }).then((r) => r.data),
    remove: (uuid: UUID) => api.delete(`/org/departments/${uuid}`).then((r) => r.data),
  },
  designations: {
    list: () => api.get<{ items: ManagedOption[] }>("/org/designations").then((r) => r.data.items),
    create: (name: string) =>
      api.post<ManagedOption>("/org/designations", { name }).then((r) => r.data),
    remove: (uuid: UUID) => api.delete(`/org/designations/${uuid}`).then((r) => r.data),
  },
  employeeDocuments: {
    list: (employeeUuid: UUID) =>
      api.get<{ items: EmployeeDocument[] }>(`/org/employees/${employeeUuid}/documents`).then((r) => r.data.items),
    upload: (employeeUuid: UUID, form: FormData) =>
      api
        .post<{ items: EmployeeDocument[] }>(`/org/employees/${employeeUuid}/documents`, form)
        .then((r) => r.data.items),
    remove: (docUuid: UUID) => api.delete(`/org/employees/documents/${docUuid}`).then((r) => r.data),
  },

  users: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<OrgUserRecord>>("/org/users", { params }).then((r) => r.data),

  adminUsers: {
    list: (params: { page?: number; limit?: number; search?: string } = {}) =>
      api.get<Paginated<OrgAdminUserRecord>>("/org/admin-users", { params }).then((r) => r.data),
    create: (data: {
      full_name: string;
      email: string;
      cnic: string;
      phone?: string;
      feature_access: Pick<FeatureAccess, "manage_employees" | "generate_request" | "approve_request">;
    }) =>
      api
        .post<{ user: OrgAdminUserRecord; _email_warning?: string }>("/org/admin-users", data)
        .then((r) => r.data),
    revoke: (uuid: UUID, action: "demote" | "deactivate") =>
      api
        .post<{ user: OrgAdminUserRecord }>(`/org/admin-users/${uuid}/revoke`, { action })
        .then((r) => r.data.user),
    update: (
      uuid: UUID,
      feature_access: Pick<FeatureAccess, "manage_employees" | "generate_request" | "approve_request">,
    ) =>
      api
        .patch<{ user: OrgAdminUserRecord }>(`/org/admin-users/${uuid}`, { feature_access })
        .then((r) => r.data.user),
    /**
     * Cancel a pending invitation. Only valid while is_verified === 'no'; the
     * backend refuses otherwise, so this is not merely a UI nicety.
     */
    cancelInvite: (uuid: UUID) =>
      api.delete(`/org/admin-users/${uuid}/cancel-invite`).then((r) => r.data),
    /** Permanently delete a sub-admin who never accepted. Same 'no'-only rule. */
    remove: (uuid: UUID) => api.delete(`/org/admin-users/${uuid}`).then((r) => r.data),
  },
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LEAVES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type LeaveType = {
  id: number;
  name: string;
  days_allowed_per_year: number;
  organization_uuid?: UUID | null;
  organization_name?: string | null;
  created_at?: string;
};

export type LeaveRequest = {
  uuid: UUID;
  employee_uuid: UUID;
  employee_name?: string | null;
  employee_email?: string | null;
  designation?: string | null;
  leave_type_id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  organization_uuid?: UUID | null;
  organization_name?: string | null;
};

export type LeaveBalance = {
  id: number;
  year: number;
  total_allocated: number;
  used: number;
  remaining: number;
  leave_type_id: number;
  leave_type_name: string;
};

export type LeaveAllocation = {
  leave_type_id: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
};

export type EmployeeLeaveAllocation = {
  employee_uuid: UUID;
  full_name: string;
  email: string;
  designation?: string | null;
  department?: string | null;
  status: string;
  allocations: LeaveAllocation[];
};

export type EmployeeLeaveAllocationHistory = {
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  leave_type_id: number;
  leave_type_name: string;
};

/* Platform user leaves */
export const leavesService = {
  types: () => api.get<{ leaveTypes: LeaveType[] }>("/leaves/types").then((r) => r.data.leaveTypes),
  balance: () =>
    api.get<{ balances: LeaveBalance[] }>("/leaves/balance").then((r) => r.data.balances),
  mine: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<LeaveRequest>>("/leaves/mine", { params }).then((r) => r.data),
  create: (data: {
    leave_type_id: number;
    start_date: string;
    end_date: string;
    reason?: string;
  }) => api.post<{ leaveRequest: LeaveRequest }>("/leaves", data).then((r) => r.data.leaveRequest),
  decide: (uuid: UUID, data: { status: "approved" | "rejected" }) =>
    api
      .patch<{ leaveRequest: LeaveRequest }>(`/leaves/${uuid}/decide`, data)
      .then((r) => r.data.leaveRequest),
};

/* Org-admin leave management + review */
export const orgLeavesService = {
  types: () =>
    api.get<{ leaveTypes: LeaveType[] }>("/org/leave-types").then((r) => r.data.leaveTypes),
  createType: (data: { name: string; days_allowed_per_year?: number }) =>
    api.post<{ leaveType: LeaveType }>("/org/leave-types", data).then((r) => r.data.leaveType),
  updateType: (id: number, data: { name: string; days_allowed_per_year?: number }) =>
    api.put<{ leaveType: LeaveType }>(`/org/leave-types/${id}`, data).then((r) => r.data.leaveType),
  deleteType: (id: number) => api.delete(`/org/leave-types/${id}`).then((r) => r.data),
  list: (params: { page?: number; limit?: number; status?: string; search?: string } = {}) =>
    api.get<Paginated<LeaveRequest>>("/org/leaves", { params }).then((r) => r.data),
  decide: (uuid: UUID, data: { status: "approved" | "rejected" }) =>
    api
      .patch<{ leaveRequest: LeaveRequest }>(`/leaves/${uuid}/decide`, data)
      .then((r) => r.data.leaveRequest),
};

/* Org-admin leave allocations (per employee, per type, per year) */
export const orgLeaveAllocationService = {
  list: (year: number) =>
    api
      .get<{
        year: number;
        leaveTypes: LeaveType[];
        employees: EmployeeLeaveAllocation[];
      }>("/org/leave-allocations", { params: { year } })
      .then((r) => r.data),
  set: (data: {
    employee_uuid: UUID;
    leave_type_id: number;
    year: number;
    allocated_days: number;
  }) => api.put<{ allocation: { id: number; allocated_days: number } }>("/org/leave-allocations", data).then((r) => r.data),
  employeeHistory: (employee_uuid: UUID) =>
    api
      .get<{
        employee_uuid: UUID;
        employee_name: string;
        employee_email: string;
        allocations: EmployeeLeaveAllocationHistory[];
      }>(`/org/employees/${employee_uuid}/leave-allocations`)
      .then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ATTENDANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type AttendanceRecord = {
  uuid: UUID;
  employee_uuid: UUID;
  organization_id: number;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_ip: string | null;
  check_out_ip: string | null;
  date: string;
  status: "checked_in" | "checked_out";
  created_at: string;
  employee_name?: string | null;
  employee_email?: string | null;
  designation?: string | null;
  organization_uuid?: UUID | null;
  organization_name?: string | null;
};

export type IpRule = {
  id: number;
  ip_address: string;
  rule_type: "allow" | "deny";
};

/* Org-admin attendance + allowed office-network IPs */
export const orgAttendanceService = {
  list: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    } = {},
  ) => api.get<Paginated<AttendanceRecord>>("/org/attendance", { params }).then((r) => r.data),
  ips: () =>
    api.get<{ allowedIps: string[]; rules: IpRule[] }>("/org/attendance/ips").then((r) => r.data),
  addIp: (ip: string) =>
    api
      .post<{ allowedIps: string[]; rules: IpRule[] }>("/org/attendance/ips", { ip })
      .then((r) => r.data),
  removeIp: (id: number) =>
    api
      .delete<{ allowedIps: string[]; rules: IpRule[] }>(`/org/attendance/ips/${id}`)
      .then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SALARY / PAYROLL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type SalaryRecord = {
  uuid: UUID;
  employee_uuid: UUID;
  month: number;
  year: number;
  basic_salary: string | number;
  allowances: string | number;
  deductions: string | number;
  net_salary: string | number;
  notes?: string | null;
  created_at?: string;
  employee_name?: string | null;
  employee_email?: string | null;
  designation?: string | null;
  organization_uuid?: UUID | null;
  organization_name?: string | null;
};

export type SalaryComponent = {
  id: number;
  uuid: UUID;
  organization_id: number;
  name: string;
  type: "allowance" | "deduction";
  is_percentage: boolean;
  default_value: string | number;
  is_active: boolean;
  created_at?: string;
};

export type SalaryHistoryEntry = {
  uuid: UUID;
  year: number;
  basic_salary: string | number;
  effective_from: string;
  effective_to: string | null;
  created_at?: string;
};

export type EmployeeSalaryComponent = {
  uuid: UUID;
  employee_uuid: UUID;
  salary_component_id: number;
  amount: string | number;
  is_active: boolean;
  assigned_at?: string;
  name: string;
  type: "allowance" | "deduction";
  component_is_percentage: boolean;
  component_default_value: string | number;
};

/* Org-admin payroll — auto-generated ledger with CSV export */
export const orgSalaryService = {
  list: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      employee_uuid?: string;
      month?: number;
      year?: number;
    } = {},
  ) => api.get<Paginated<SalaryRecord>>("/org/salary-records", { params }).then((r) => r.data),
  generate: (data: { month: number; year: number; employee_uuids?: UUID[]; regenerate?: boolean }) =>
    api
      .post<{
        items: SalaryRecord[];
        month: number;
        year: number;
        count: number;
        skipped?: number;
        message?: string;
      }>("/org/payroll/generate", data)
      .then((r) => r.data),
  exportCsv: async (params: { search?: string; employee_uuid?: string; month?: number; year?: number } = {}) => {
    const r = await api.get("/org/salary-records/export", { params, responseType: "blob" });
    return r.data as Blob;
  },
  payslip: async (uuid: UUID) => {
    const r = await api.get(`/org/salary-records/${uuid}/payslip`, {
      responseType: "blob",
    });
    return r.data as Blob;
  },
  deleteRecord: (uuid: UUID) => api.delete(`/org/salary-records/${uuid}`).then((r) => r.data),
  deletePeriod: (month: number, year: number) =>
    api.delete(`/org/salary-records/period/${year}/${month}`).then((r) => r.data),
};

/* Org-admin defined allowances/deductions + employee salary history */
export const salaryComponentService = {
  list: (type?: "allowance" | "deduction") =>
    api
      .get<{ items: SalaryComponent[] }>("/org/salary-components", { params: type ? { type } : {} })
      .then((r) => r.data.items),
  create: (data: {
    name: string;
    type: "allowance" | "deduction";
    is_percentage: boolean;
    is_active?: boolean;
  }) =>
    api.post<{ component: SalaryComponent }>("/org/salary-components", data).then((r) => r.data.component),
  update: (uuid: UUID, data: { name: string; is_percentage: boolean; is_active?: boolean }) =>
    api.put<{ component: SalaryComponent }>(`/org/salary-components/${uuid}`, data).then((r) => r.data.component),
  toggleStatus: (uuid: UUID) =>
    api.patch<{ component: SalaryComponent }>(`/org/salary-components/${uuid}/status`).then((r) => r.data.component),
  remove: (uuid: UUID) => api.delete(`/org/salary-components/${uuid}`).then((r) => r.data),
};

export const orgEmployeeSalaryService = {
  history: (employeeUuid: UUID) =>
    api
      .get<{ history: SalaryHistoryEntry[] }>(`/org/employees/${employeeUuid}/salary-history`)
      .then((r) => r.data.history),
  increment: (employeeUuid: UUID, data: { new_basic_salary: number; effective_from: string }) =>
    api
      .post<{ history: SalaryHistoryEntry[] }>(`/org/employees/${employeeUuid}/increment-salary`, data)
      .then((r) => r.data.history),
  update: (employeeUuid: UUID, historyUuid: UUID, data: { basic_salary?: number; effective_from?: string }) =>
    api
      .put<{ history: SalaryHistoryEntry[] }>(`/org/employees/${employeeUuid}/salary-history/${historyUuid}`, data)
      .then((r) => r.data.history),
  remove: (employeeUuid: UUID, historyUuid: UUID) =>
    api
      .delete<{ history: SalaryHistoryEntry[] }>(`/org/employees/${employeeUuid}/salary-history/${historyUuid}`)
      .then((r) => r.data.history),
  components: (employeeUuid: UUID) =>
    api
      .get<{ assignments: EmployeeSalaryComponent[] }>(`/org/employees/${employeeUuid}/salary-components`)
      .then((r) => r.data.assignments),
  assignComponent: (employeeUuid: UUID, data: { salary_component_id: number; amount: number }) =>
    api
      .post<{ assignments: EmployeeSalaryComponent[] }>(`/org/employees/${employeeUuid}/salary-components`, data)
      .then((r) => r.data.assignments),
  updateComponent: (
    employeeUuid: UUID,
    assignUuid: UUID,
    data: { amount?: number; is_active?: boolean }
  ) =>
    api
      .put<{ assignments: EmployeeSalaryComponent[] }>(`/org/employees/${employeeUuid}/salary-components/${assignUuid}`, data)
      .then((r) => r.data.assignments),
  removeComponent: (employeeUuid: UUID, assignUuid: UUID) =>
    api
      .delete<{ assignments: EmployeeSalaryComponent[] }>(`/org/employees/${employeeUuid}/salary-components/${assignUuid}`)
      .then((r) => r.data.assignments),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LEADS TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type LeadStatusHistory = {
  id: number;
  lead_type: "contact" | "access_request";
  lead_uuid: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_by_admin_id: number | null;
  changed_by_name: string | null;
  created_at: string;
};

export type ContactLead = {
  uuid: UUID;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "new" | "contacted" | "closed";
  notes: string | null;
  latest_status: string | null;
  latest_note: string | null;
  latest_changed_by: string | null;
  latest_note_at: string | null;
  created_at: string;
};

export type AccessRequest = {
  uuid: UUID;
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  company_size: string | null;
  message: string | null;
  status: "new" | "contacted" | "onboarded" | "rejected";
  notes: string | null;
  latest_status: string | null;
  latest_note: string | null;
  latest_changed_by: string | null;
  latest_note_at: string | null;
  created_at: string;
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LEADS (public) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const leadsService = {
  submitContact: (data: { name: string; email: string; phone?: string; message?: string }) =>
    api.post<{ lead: ContactLead }>("/leads/contact", data).then((r) => r.data.lead),
  submitAccessRequest: (data: {
    organization_name: string;
    contact_name: string;
    email: string;
    phone?: string;
    company_size?: string;
    message?: string;
  }) =>
    api.post<{ request: AccessRequest }>("/leads/request-access", data).then((r) => r.data.request),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ADMIN LEADS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const adminLeadsService = {
  contactLeads: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<ContactLead>>("/admin/leads/contact", { params }).then((r) => r.data),
  getContactLead: (uuid: string) =>
    api.get<{ lead: ContactLead; history: LeadStatusHistory[] }>(`/admin/leads/contact/${uuid}`).then((r) => r.data),
  updateContactLeadStatus: (uuid: string, data: { status: string; notes?: string }) =>
    api.patch<{ lead: ContactLead }>(`/admin/leads/contact/${uuid}/status`, data).then((r) => r.data.lead),
  accessRequests: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api
      .get<Paginated<AccessRequest>>("/admin/leads/request-access", { params })
      .then((r) => r.data),
  getAccessRequest: (uuid: string) =>
    api.get<{ request: AccessRequest; history: LeadStatusHistory[] }>(`/admin/leads/request-access/${uuid}`).then((r) => r.data),
  updateAccessRequestStatus: (uuid: string, data: { status: string; notes?: string }) =>
    api.patch<{ request: AccessRequest }>(`/admin/leads/request-access/${uuid}/status`, data).then((r) => r.data.request),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ADMIN LOGIN HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type LoginHistoryRecord = {
  id: number;
  uuid: string;
  identity_type: "admin" | "user";
  identity_id: number;
  email?: string;
  full_name?: string;
  ip_address?: string;
  user_agent?: string;
  login_at: string;
  success: "yes" | "no";
};

export const adminLoginHistoryService = {
  list: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      success?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ) =>
    api.get<Paginated<LoginHistoryRecord>>("/admin/login-history", { params }).then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ADMIN AUDIT LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type AuditLogRecord = {
  id: number;
  uuid: string;
  actor_type: "admin" | "user";
  actor_id: number;
  actor_name?: string;
  actor_role?: "system_admin" | "org_admin" | "member" | "unknown";
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown> | string | null;
  ip_address?: string;
  created_at: string;
};

export const adminAuditLogService = {
  list: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      action?: string;
      actor_type?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ) => api.get<Paginated<AuditLogRecord>>("/admin/audit-logs", { params }).then((r) => r.data),
  actions: () =>
    api.get<{ items: string[] }>("/admin/audit-logs/actions").then((r) => r.data.items),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const dashboardService = {
  auto: () => api.get<DashboardStats>("/dashboard").then((r) => r.data),
  admin: () => api.get<DashboardStats>("/dashboard/admin").then((r) => r.data),
  user: () => api.get<DashboardStats>("/dashboard/user").then((r) => r.data),
  analytics: () => api.get<AdminAnalytics>("/dashboard/analytics").then((r) => r.data),
  orgAnalytics: () => api.get<OrgDashboardAnalytics>("/org/dashboard/analytics").then((r) => r.data),
};

export type AdminAnalytics = {
  requests_per_month: { month: string; count: number }[];
  request_status_breakdown: { status: string; count: number }[];
  orgs_registered_per_month: { month: string; count: number }[];
  top_organizations_by_requests: { org_name: string; request_count: number }[];
};

export type OrgDashboardAnalytics = {
  active_employee_count: number;
  pending_leave_requests_count: number;
  today_attendance: { present: number; total: number };
  this_month_payroll_total: number;
  quota_status: {
    free_daily_requests: number;
    plan_quota: number;
    total_allowance: number;
    requests_used: number;
    total_requests: number;
    requests_remaining: number;
    plan: { uuid: string | null; name: string | null; daily_request_quota: number };
  } | null;
  headcount_by_department: { department: string; count: number }[];
  today_attendance_breakdown: { present: number; late: number; absent: number; total: number };
  monthly_payroll_trend: { month: string; total: number }[];
  leave_utilization: { leave_type: string; days_used: number }[];
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type Notification = {
  id: number;
  user_uuid: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
};

export const notificationService = {
  list: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<Notification>>("/notifications", { params }).then((r) => r.data),
  unreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data.count),
  markRead: (id: number) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markReadByReference: (referenceId: string) =>
    api.post(`/notifications/read-by-reference/${referenceId}`).then((r) => r.data),
  markAllRead: () => api.post("/notifications/read-all").then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MEMBER SELF-SERVICE: ATTENDANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const attendanceService = {
  today: () =>
    api.get<{ record: AttendanceRecord | null }>("/attendance/today").then((r) => r.data),
  checkIn: () =>
    api.post<{ record: AttendanceRecord }>("/attendance/check-in").then((r) => r.data),
  checkOut: () =>
    api.post<{ record: AttendanceRecord }>("/attendance/check-out").then((r) => r.data),
  history: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<AttendanceRecord>>("/attendance/history", { params }).then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MEMBER SELF-SERVICE: SALARY / PAYSLIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const salaryService = {
  mine: (params: { page?: number; limit?: number; month?: string; year?: string } = {}) =>
    api.get<Paginated<SalaryRecord>>("/salary-records/mine", { params }).then((r) => r.data),
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUPPORT TICKETS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type SupportTicket = {
  uuid: UUID;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  organization_uuid?: UUID | null;
  organization_name?: string | null;
  raised_by_uuid?: UUID | null;
  raised_by_name?: string | null;
  raised_by_email?: string | null;
};

export type SupportReply = {
  uuid: UUID;
  message: string;
  replied_by_type: "admin" | "org_user";
  replied_by_uuid: UUID;
  replied_by_name?: string | null;
  replied_by_email?: string | null;
  created_at: string;
};

export type SupportTicketDetail = {
  ticket: SupportTicket;
  replies: SupportReply[];
};

/** Org side — an organization user raises and tracks their own tickets. */
export const orgSupportService = {
  list: (params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
  } = {}) =>
    api.get<Paginated<SupportTicket>>("/org/support/tickets", { params }).then((r) => r.data),
  create: (data: {
    subject: string;
    description: string;
    priority: "low" | "medium" | "high";
  }) => api.post<{ ticket: SupportTicket }>("/org/support/tickets", data).then((r) => r.data),
  get: (uuid: UUID) =>
    api.get<SupportTicketDetail>(`/org/support/tickets/${uuid}`).then((r) => r.data),
  addReply: (uuid: UUID, message: string) =>
    api
      .post<SupportTicketDetail>(`/org/support/tickets/${uuid}/replies`, { message })
      .then((r) => r.data),
};

/** System-admin side — cross-organization support triage. */
export const adminSupportService = {
  list: (params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
  } = {}) =>
    api.get<Paginated<SupportTicket>>("/admin/support-tickets", { params }).then((r) => r.data),
  get: (uuid: UUID) =>
    api.get<SupportTicketDetail>(`/admin/support-tickets/${uuid}`).then((r) => r.data),
  addReply: (uuid: UUID, message: string) =>
    api
      .post<SupportTicketDetail>(`/admin/support-tickets/${uuid}/replies`, { message })
      .then((r) => r.data),
  updateStatus: (uuid: UUID, status: SupportTicket["status"]) =>
    api
      .patch<{ ticket: SupportTicket }>(`/admin/support-tickets/${uuid}/status`, { status })
      .then((r) => r.data),
};
