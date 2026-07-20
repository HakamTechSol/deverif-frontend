import { api, type Paginated } from "@/lib/api";

/** Types matching backend shape. */
export type UUID = string;

export type Organization = {
  uuid: UUID;
  name: string;
  verified: boolean;
  organization_type: "education" | "government" | "software_house";
  logo?: string | null;
  created_at?: string;
};

export type UserRecord = {
  uuid: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "admin" | "user";
  status?: "active" | "suspended";
  profile_image?: string | null;
  organization?: Organization | null;
  created_at?: string;
};

export type VerificationRequest = {
  uuid: UUID;
  document_type: string;
  issuing_organization?: Organization | null;
  other_organization_name?: string | null;
  submission_remarks?: string | null;
  verification_remarks?: string | null;
  priority: "normal" | "urgent";
  status: "pending" | "verified" | "unverified" | "under_review" | "rejected";
  document_url?: string;
  document_format?: string;
  submitted_by?: UserRecord;
  submitted_at: string;
  organization_conserned_for_future?: "yes" | "no";
};

export type Payment = {
  uuid: UUID;
  user?: UserRecord;
  amount: number;
  payment_method: "jazzcash" | "easypaisa" | "manual";
  transaction_reference: string;
  purpose: string;
  status?: string;
  created_at: string;
};

/* ─────────── AUTH ─────────── */
export const authService = {
  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    api.post("/auth/login", data).then((r) => r.data),
  adminLogin: (data: { email: string; password: string }) =>
    api.post("/admin/auth/login", data).then((r) => r.data),
  refresh: () => api.post("/auth/refresh").then((r) => r.data),
  userLogout: () => api.post("/auth/user/logout").then((r) => r.data),
  adminLogout: () => api.post("/admin/auth/logout").then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post("/auth/user/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/user/reset-password", { token, newPassword }).then((r) => r.data),
  me: () => api.get<UserRecord>("/users/me").then((r) => r.data),
  adminMe: () => api.get<UserRecord>("/admin/auth/me").then((r) => r.data),
  updateProfile: (form: FormData) =>
    api.patch<UserRecord>("/users/me", form).then((r) => r.data),
  updateAdminProfile: (data: { full_name: string; phone?: string }) =>
    api.patch<UserRecord>("/admin/auth/profile", data).then((r) => r.data),
};

/* ─────────── VERIFICATION REQUESTS (user) ─────────── */
export const requestsService = {
  organizations: () =>
    api.get<Organization[]>("/verification-requests/organizations").then((r) => r.data),
  create: (form: FormData) =>
    api.post<VerificationRequest>("/verification-requests", form).then((r) => r.data),
  mySent: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/sent", { params })
      .then((r) => r.data),
  deleteSent: (uuid: UUID) =>
    api.delete(`/verification-requests/my/sent/${uuid}`).then((r) => r.data),
  myInbox: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api
      .get<Paginated<VerificationRequest>>("/verification-requests/my/inbox", { params })
      .then((r) => r.data),
  verify: (
    uuid: UUID,
    data: {
      status: "verified" | "unverified";
      verification_remarks: string;
      organization_conserned_for_future: "yes" | "no";
    },
  ) => api.patch(`/verification-requests/${uuid}/verify`, data).then((r) => r.data),
};

/* ─────────── PAYMENTS (user) ─────────── */
export const paymentService = {
  providers: () => api.get("/payment/providers").then((r) => r.data),
  initiate: (data: { amount: number; provider: string; purpose?: string }) =>
    api.post("/payment/initiate", data).then((r) => r.data),
  plan: () => api.get("/payment/plan").then((r) => r.data),
};

/* ─────────── ADMIN ─────────── */
export const adminService = {
  users: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<UserRecord>>("/admin/users", { params }).then((r) => r.data),
  createUser: (form: FormData) =>
    api.post<UserRecord>("/admin/users", form).then((r) => r.data),
  updateUser: (uuid: UUID, data: Record<string, unknown>) =>
    api.put<UserRecord>(`/admin/users/${uuid}`, data).then((r) => r.data),
  deleteUser: (uuid: UUID) => api.delete(`/admin/users/${uuid}`).then((r) => r.data),

  organizations: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<Organization>>("/admin/organizations", { params }).then((r) => r.data),
  createOrganization: (form: FormData) =>
    api.post<Organization>("/admin/organizations", form).then((r) => r.data),
  updateOrganization: (uuid: UUID, form: FormData) =>
    api.put<Organization>(`/admin/organizations/${uuid}`, form).then((r) => r.data),
  deleteOrganization: (uuid: UUID) =>
    api.delete(`/admin/organizations/${uuid}`).then((r) => r.data),

  requests: (
    params: { page?: number; limit?: number; search?: string; status?: string } = {},
  ) =>
    api
      .get<Paginated<VerificationRequest>>("/admin/verification-requests", { params })
      .then((r) => r.data),
  nullOrgRequests: () =>
    api
      .get<VerificationRequest[] | Paginated<VerificationRequest>>(
        "/admin/verification-requests/null-organization",
      )
      .then((r) => r.data),
  acceptRequest: (
    uuid: UUID,
    data: { verification_remarks: string; issuing_organization_uuid?: UUID },
  ) =>
    api
      .patch(`/admin/verification-requests/${uuid}/accept`, data)
      .then((r) => r.data),
  deleteRequest: (uuid: UUID) =>
    api.delete(`/admin/verification-requests/${uuid}`).then((r) => r.data),

  payments: (
    params: { page?: number; limit?: number; search?: string; method?: string } = {},
  ) => api.get<Paginated<Payment>>("/admin/payment", { params }).then((r) => r.data),
  createPayment: (data: {
    user_uuid: UUID;
    amount: number;
    payment_method: "jazzcash" | "easypaisa" | "manual";
    transaction_reference: string;
    purpose: string;
  }) => api.post<Payment>("/admin/payment", data).then((r) => r.data),
};

/* ─────────── DASHBOARD ─────────── */
export type DashboardStats = {
  role: "admin" | "user";
  totals?: {
    users?: number;
    organizations?: number;
    requests?: number;
    null_org_pending?: number;
    my_organizations?: number;
    my_requests?: number;
    inbox_requests?: number;
  };
  recent?: VerificationRequest[];
};
export const dashboardService = {
  auto: () => api.get<DashboardStats>("/dashboard").then((r) => r.data),
  admin: () => api.get<DashboardStats>("/dashboard/admin").then((r) => r.data),
  user: () => api.get<DashboardStats>("/dashboard/user").then((r) => r.data),
};
