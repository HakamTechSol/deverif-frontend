export type PermissionValidationError = {
  permission: string;
  requiredPermission: string;
  message: string;
};

export const PERMISSION_DEPENDENCIES: Readonly<Record<string, string>> = Object.freeze({
  "employees.create": "employees.view",
  "employees.edit": "employees.view",
  "employees.archive": "employees.view",
  "employees.manage_departments": "employees.view",
  "employees.manage_designations": "employees.view",
  "document_verification.generate_request": "document_verification.view_requests",
  "document_verification.edit_draft": "document_verification.view_requests",
  "document_verification.approve": "document_verification.view_requests",
  "document_verification.reject": "document_verification.view_requests",
  "attendance.manual_entry": "attendance.view",
  "attendance.correct_check_in_out": "attendance.view",
  "attendance.manage_ips": "attendance.view",
  "leave_management.approve": "leave_management.view",
  "leave_management.reject": "leave_management.view",
  "leave_management.allocate_balance": "leave_management.view",
  "leave_management.manage_leave_types": "leave_management.view",
  "payroll.generate": "payroll.view",
  "payroll.manage_settings": "payroll.view",
  "payroll.manage_employee_components": "payroll.view",
  "payroll.adjust_salary": "payroll.view",
  "expenses.create_own": "expenses.view",
  "expenses.approve_employee": "expenses.view",
  "expenses.process_payment": "expenses.view",
  "hr_letters.create_draft": "hr_letters.view",
  "hr_letters.edit_draft": "hr_letters.view",
  "hr_letters.issue": "hr_letters.view",
  "hr_letters.revoke": "hr_letters.view",
  "hr_letters.manage_templates": "hr_letters.view",
  "assets.create": "assets.view",
  "assets.edit": "assets.view",
  "assets.assign": "assets.view",
  "assets.return": "assets.view",
  "assets.retire": "assets.view",
  "offboarding.initiate": "offboarding.view",
  "offboarding.manage_checklist": "offboarding.view",
  "offboarding.draft_settlement": "offboarding.view",
  "offboarding.approve_settlement": "offboarding.view",
  "offboarding.complete_exit": "offboarding.view",
  "recruitment.create_job": "recruitment.view",
  "recruitment.edit_job": "recruitment.view",
  "recruitment.manage_candidates": "recruitment.view",
  "recruitment.schedule_interview": "recruitment.view",
  "recruitment.record_feedback": "recruitment.view",
  "recruitment.manage_offers": "recruitment.view",
  "recruitment.hire": "recruitment.view",
});

const MODULE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  employees: "Employees",
  document_verification: "Document Verification",
  attendance: "Attendance",
  leave_management: "Leave Management",
  payroll: "Payroll",
  expenses: "Expenses",
  hr_letters: "HR Letters",
  assets: "Assets",
  offboarding: "Offboarding",
  recruitment: "Recruitment",
});

const ACTION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  view: "View",
  view_requests: "View Requests",
  create: "Create",
  edit: "Edit",
  archive: "Archive",
  manage_departments: "Manage Departments",
  manage_designations: "Manage Designations",
  generate_request: "Generate Request",
  edit_draft: "Edit Draft",
  approve: "Approve",
  reject: "Reject",
  manual_entry: "Manual Entry",
  correct_check_in_out: "Correct Check-in/out",
  manage_ips: "Manage IPs",
  allocate_balance: "Allocate Balance",
  manage_leave_types: "Manage Leave Types",
  generate: "Generate",
  manage_settings: "Manage Settings",
  manage_employee_components: "Manage Employee Components",
  adjust_salary: "Adjust Salary",
  create_own: "Create Own",
  approve_employee: "Approve Employee",
  process_payment: "Process Payment",
  create_draft: "Create Letter",
  issue: "Issue",
  revoke: "Revoke",
  manage_templates: "Manage Templates",
  assign: "Assign",
  return: "Return",
  retire: "Retire",
  initiate: "Create Exit Request",
  manage_checklist: "Manage Clearance Checklist",
  draft_settlement: "Draft Final Settlement",
  approve_settlement: "Approve / Pay Settlement",
  complete_exit: "Complete Exit",
  create_job: "Create Job Opening",
  edit_job: "Edit Job Opening",
  manage_candidates: "Manage Candidates",
  schedule_interview: "Schedule Interviews",
  record_feedback: "Record Interview Feedback",
  manage_offers: "Manage / Send Offers",
  hire: "Hire Candidates",
});

function label(permission: string): string {
  const [module, action] = permission.split(".");
  return `${MODULE_LABELS[module] ?? module} ${ACTION_LABELS[action] ?? action}`;
}

export function validatePermissionSelection(grants: Record<string, boolean>): PermissionValidationError[] {
  const errors: PermissionValidationError[] = [];
  for (const [permission, requiredPermission] of Object.entries(PERMISSION_DEPENDENCIES)) {
    if (grants[permission] !== true || grants[requiredPermission] === true) continue;
    errors.push({
      permission,
      requiredPermission,
      message:
        `Cannot assign ${label(permission)} because ${label(requiredPermission)} is disabled. ` +
        `Enable ${label(requiredPermission)} before assigning this action.`,
    });
  }
  return errors;
}
