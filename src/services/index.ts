import { api, type Paginated } from "@/lib/api";

export type UUID = string;

export type Organization = {
  uuid: UUID;
  name: string;
  verified: "yes" | "no";
  organization_type: string;
  logo?: string | null;
  subscription_status?: "active" | "expired" | "none";
  subscription_start?: string | null;
  subscription_expiry?: string | null;
  subscription_plan?: "monthly" | "yearly" | null;
  created_at?: string;
};

export type UserRecord = {
  uuid: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  cnic?: string | null;
  status: "active" | "inactive";
  subscription_plan?: "free" | "basic" | "premium";
  subscription_expiry?: string | null;
  profile_image?: string | null;
  is_verified?: "yes" | "no";
  created_at?: string;
  organization_uuid?: string | null;
  organization_name?: string | null;
};

export type VerificationRequest = {
  uuid: UUID;
  document_type: string;
  issuing_organization_uuid?: string | null;
  issuing_org_name?: string | null;
  other_organization_name?: string | null;
  submission_remarks?: string | null;
  verification_remarks?: string | null;
  priority: "normal" | "urgent";
  status: "under_review" | "verified" | "unverified";
  document_path?: string;
  document_format?: string;
  submitted_at: string;
  organization_conserned_for_future?: "yes" | "no";
  verification_method?: string;
  requester_uuid?: string;
  requester_name?: string;
  requester_email?: string;
  requester_organization_uuid?: string | null;
  requester_organization?: string | null;
};

export type AdminUserRecord = UserRecord;

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
  code: string;
  label: string;
  purchased_plan: string;
  purchased_plan_label: string;
  expires_at: string | null;
  has_expiry: boolean;
  is_expired: boolean;
  is_active: boolean;
  status: string;
};

export type OrgSubscription = {
  status: "active" | "expired" | "none";
  plan: "monthly" | "yearly" | null;
  expiry: string | null;
  start: string | null;
} | null;

export type PaymentProvider = { code: string; label: string };
export type PurchasablePlan = { code: string; label: string; amount: number; duration_days: number };

export type DashboardStats = {
  total_users?: number;
  total_organizations?: number;
  total_verification_requests?: number;
  total_admin_requests?: number;
  active_users?: number;
  verified_organizations?: number;
  verified_requests?: number;
  users_progress?: number;
  organizations_progress?: number;
  requests_progress?: number;
  unmatched_progress?: number;
  upcoming_expirations?: Array<{
    uuid: string;
    name: string;
    subscription_expiry: string;
    subscription_plan: string | null;
  }>;
};

/* ─────────── AUTH ─────────── */
export const authService = {
  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    api.post<{ token: string; user: { uuid: string; full_name: string; email: string; role: "admin" | "user" } }>("/auth/login", data).then((r) => r.data),
  adminLogin: (data: { email: string; password: string }) =>
    api.post<{ token: string; admin: { uuid: string; email: string; full_name: string } }>("/admin/auth/login", data).then((r) => r.data),
  refresh: () => api.post<{ accessToken: string }>("/auth/refresh").then((r) => r.data),
  userLogout: () => api.post("/auth/user/logout").then((r) => r.data),
  adminLogout: () => api.post("/admin/auth/logout").then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post("/auth/user/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/user/reset-password", { token, newPassword }).then((r) => r.data),
  setPassword: (token: string, newPassword: string) =>
    api.post("/auth/user/set-password", { token, newPassword }).then((r) => r.data),
  me: () => api.get<{ user: UserRecord }>("/users/me").then((r) => r.data.user),
  adminMe: () => api.get<{ admin: { uuid: string; email: string; full_name: string; phone?: string; profile_image?: string } }>("/admin/auth/me").then((r) => r.data.admin),
  updateProfile: (form: FormData) =>
    api.patch<{ user: UserRecord }>("/users/me", form).then((r) => r.data.user),
  updateAdminProfile: (data: FormData | { full_name?: string; phone?: string; password?: string; old_password?: string }) =>
    api.patch<{ admin: { uuid: string; email: string; full_name: string; phone?: string; profile_image?: string } }>("/admin/auth/profile", data).then((r) => r.data.admin),
};

/* ─────────── VERIFICATION REQUESTS (user) ─────────── */
export const requestsService = {
  organizations: () =>
    api.get<{ items: Organization[] }>("/verification-requests/organizations").then((r) => r.data.items),
  create: (form: FormData) =>
    api.post<{ request: VerificationRequest }>("/verification-requests", form).then((r) => r.data.request),
  mySent: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/sent", { params })
      .then((r) => r.data),
  deleteSent: (uuid: UUID) =>
    api.delete(`/verification-requests/my/sent/${uuid}`).then((r) => r.data),
  updateSent: (uuid: UUID, form: FormData) =>
    api.put<{ request: VerificationRequest }>(`/verification-requests/my/sent/${uuid}`, form).then((r) => r.data.request),
  myInbox: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/inbox", { params })
      .then((r) => r.data),
  myInboxCount: () =>
    api.get<{ count: number }>("/verification-requests/my/inbox/count").then((r) => r.data.count),
  verify: (
    uuid: UUID,
    data: {
      status: "verified" | "unverified";
      verification_remarks: string;
      organization_conserned_for_future: "yes" | "no";
    },
  ) => api.patch<{ request: VerificationRequest }>(`/verification-requests/${uuid}/verify`, data).then((r) => r.data.request),
};

/* ─────────── PAYMENTS (user) ─────────── */
export const paymentService = {
  providers: () =>
    api.get<{ providers: PaymentProvider[]; plans: PurchasablePlan[] }>("/payment/providers").then((r) => r.data),
  initiate: (data: { provider: string; plan: string; purpose?: string }) =>
    api.post<{ payment: { action_url: string; method: string; fields: Record<string, string>; transaction_reference: string; amount: number; provider: string; provider_label: string }; plan: PurchasablePlan }>("/payment/initiate", data).then((r) => r.data),
  plan: () =>
    api.get<{ plan: PlanSummary; org_subscription: OrgSubscription }>("/payment/plan").then((r) => r.data),
};

/* ─────────── ADMIN ─────────── */
export const adminService = {
  users: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<AdminUserRecord>>("/admin/users", { params }).then((r) => r.data),
  createUser: (form: FormData) =>
    api.post<{ user: AdminUserRecord; _email_warning?: string }>("/admin/users", form).then((r) => r.data),
  updateUser: (uuid: UUID, data: Record<string, unknown>) =>
    api.put<{ user: AdminUserRecord }>(`/admin/users/${uuid}`, data).then((r) => r.data.user),
  deleteUser: (uuid: UUID) => api.delete(`/admin/users/${uuid}`).then((r) => r.data),
  resendInvite: (uuid: UUID) => api.post(`/admin/users/${uuid}/resend-invite`).then((r) => r.data),

  organizations: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<Organization>>("/admin/organizations", { params }).then((r) => r.data),
  createOrganization: (form: FormData) =>
    api.post<{ organization: Organization }>("/admin/organizations", form).then((r) => r.data.organization),
  updateOrganization: (uuid: UUID, form: FormData) =>
    api.put<{ organization: Organization }>(`/admin/organizations/${uuid}`, form).then((r) => r.data.organization),
  deleteOrganization: (uuid: UUID) =>
    api.delete(`/admin/organizations/${uuid}`).then((r) => r.data),
  setOrganizationSubscription: (uuid: UUID, plan: "monthly" | "yearly") =>
    api.patch<{ organization: Organization }>(`/admin/organizations/${uuid}/subscription`, { plan }).then((r) => r.data),
  cancelOrganizationSubscription: (uuid: UUID) =>
    api.delete<{ organization: Organization }>(`/admin/organizations/${uuid}/subscription`).then((r) => r.data),

  requests: (
    params: { page?: number; limit?: number; search?: string; status?: string } = {},
  ) =>
    api
      .get<Paginated<VerificationRequest>>("/admin/verification-requests", { params })
      .then((r) => r.data),
  nullOrgRequests: (params: { page?: number; limit?: number } = {}) =>
    api
      .get<Paginated<VerificationRequest>>("/admin/verification-requests/null-organization", { params })
      .then((r) => r.data),
  acceptRequest: (
    uuid: UUID,
    data: { verification_remarks: string; issuing_organization_uuid?: UUID },
  ) =>
    api
      .patch<{ request: VerificationRequest }>(`/admin/verification-requests/${uuid}/accept`, data)
      .then((r) => r.data.request),
  deleteRequest: (uuid: UUID) =>
    api.delete(`/admin/verification-requests/${uuid}`).then((r) => r.data),

  payments: (
    params: { page?: number; limit?: number; search?: string; method?: string; date_from?: string; date_to?: string } = {},
  ) => api.get<Paginated<Payment>>("/admin/payment", { params }).then((r) => r.data),
  createPayment: (data: {
    user_uuid: UUID;
    amount: number;
    payment_method: "jazzcash" | "easypaisa" | "manual";
    transaction_reference: string;
    purpose: string;
  }) => api.post<{ payment: Payment }>("/admin/payment", data).then((r) => r.data.payment),
};

/* ─────────── DASHBOARD ─────────── */
export const dashboardService = {
  auto: () => api.get<DashboardStats>("/dashboard").then((r) => r.data),
  admin: () => api.get<DashboardStats>("/dashboard/admin").then((r) => r.data),
  user: () => api.get<DashboardStats>("/dashboard/user").then((r) => r.data),
};

/* ─────────── NOTIFICATIONS ─────────── */
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
  markRead: (id: number) =>
    api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    api.post("/notifications/read-all").then((r) => r.data),
};
