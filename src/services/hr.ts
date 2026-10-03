/**
 * HR operations: leave, attendance, salary components, payroll.
 *
 *  * The cluster the module expansion grows out of, so it is organised per module
 *  * rather than per resource as each new module lands.
 *
 * Split out of the former single-file services/index.ts. Nothing here may import
 * anything except "@/lib/api" and "./core": services importing from lib/ would
 * close a runtime import cycle via lib/api -> lib/auth -> services.
 */

import { api, type Paginated } from "@/lib/api";

import type {
  UUID,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  EmployeeLeaveAllocation,
  EmployeeLeaveAllocationHistory,
  AttendanceRecord,
  IpRule,
  SalaryRecord,
  SalaryComponent,
  SalaryHistoryEntry,
  EmployeeSalaryComponent,
} from "./core";
export const leavesService = {
  types: () => api.get<{ leaveTypes: LeaveType[] }>("/leaves/types").then((r) => r.data.leaveTypes),
  balance: () =>
    api.get<{ balances: LeaveBalance[] }>("/leaves/balance").then((r) => r.data.balances),
  mine: (
    params: {
      page?: number;
      limit?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) => api.get<Paginated<LeaveRequest>>("/leaves/mine", { params }).then((r) => r.data),
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
  }) =>
    api
      .put<{ allocation: { id: number; allocated_days: number } }>("/org/leave-allocations", data)
      .then((r) => r.data),
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
  generate: (data: {
    month: number;
    year: number;
    employee_uuids?: UUID[];
    regenerate?: boolean;
  }) =>
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
  exportCsv: async (
    params: { search?: string; employee_uuid?: string; month?: number; year?: number } = {},
  ) => {
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
    api
      .post<{ component: SalaryComponent }>("/org/salary-components", data)
      .then((r) => r.data.component),
  update: (uuid: UUID, data: { name: string; is_percentage: boolean; is_active?: boolean }) =>
    api
      .put<{ component: SalaryComponent }>(`/org/salary-components/${uuid}`, data)
      .then((r) => r.data.component),
  toggleStatus: (uuid: UUID) =>
    api
      .patch<{ component: SalaryComponent }>(`/org/salary-components/${uuid}/status`)
      .then((r) => r.data.component),
  remove: (uuid: UUID) => api.delete(`/org/salary-components/${uuid}`).then((r) => r.data),
};

export const orgEmployeeSalaryService = {
  history: (employeeUuid: UUID) =>
    api
      .get<{ history: SalaryHistoryEntry[] }>(`/org/employees/${employeeUuid}/salary-history`)
      .then((r) => r.data.history),
  increment: (employeeUuid: UUID, data: { new_basic_salary: number; effective_from: string }) =>
    api
      .post<{ history: SalaryHistoryEntry[] }>(
        `/org/employees/${employeeUuid}/increment-salary`,
        data,
      )
      .then((r) => r.data.history),
  update: (
    employeeUuid: UUID,
    historyUuid: UUID,
    data: { basic_salary?: number; effective_from?: string },
  ) =>
    api
      .put<{ history: SalaryHistoryEntry[] }>(
        `/org/employees/${employeeUuid}/salary-history/${historyUuid}`,
        data,
      )
      .then((r) => r.data.history),
  remove: (employeeUuid: UUID, historyUuid: UUID) =>
    api
      .delete<{ history: SalaryHistoryEntry[] }>(
        `/org/employees/${employeeUuid}/salary-history/${historyUuid}`,
      )
      .then((r) => r.data.history),
  components: (employeeUuid: UUID) =>
    api
      .get<{ assignments: EmployeeSalaryComponent[] }>(
        `/org/employees/${employeeUuid}/salary-components`,
      )
      .then((r) => r.data.assignments),
  assignComponent: (employeeUuid: UUID, data: { salary_component_id: number; amount: number }) =>
    api
      .post<{ assignments: EmployeeSalaryComponent[] }>(
        `/org/employees/${employeeUuid}/salary-components`,
        data,
      )
      .then((r) => r.data.assignments),
  updateComponent: (
    employeeUuid: UUID,
    assignUuid: UUID,
    data: { amount?: number; is_active?: boolean },
  ) =>
    api
      .put<{ assignments: EmployeeSalaryComponent[] }>(
        `/org/employees/${employeeUuid}/salary-components/${assignUuid}`,
        data,
      )
      .then((r) => r.data.assignments),
  removeComponent: (employeeUuid: UUID, assignUuid: UUID) =>
    api
      .delete<{ assignments: EmployeeSalaryComponent[] }>(
        `/org/employees/${employeeUuid}/salary-components/${assignUuid}`,
      )
      .then((r) => r.data.assignments),
};
