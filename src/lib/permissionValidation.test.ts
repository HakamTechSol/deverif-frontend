import { describe, expect, it } from "vitest";
import { validatePermissionSelection } from "./permissionValidation";

describe("sub-admin permission validation", () => {
  it("blocks Employees Create without Employees View", () => {
    expect(validatePermissionSelection({ "employees.create": true, "employees.view": false })).toEqual([
      expect.objectContaining({
        permission: "employees.create",
        requiredPermission: "employees.view",
      }),
    ]);
  });

  it("blocks Payroll Generate without Payroll View", () => {
    expect(validatePermissionSelection({ "payroll.generate": true, "payroll.view": false })).toEqual([
      expect.objectContaining({ permission: "payroll.generate", requiredPermission: "payroll.view" }),
    ]);
  });

  it("blocks Leave Allocate Balance without Leave View", () => {
    expect(validatePermissionSelection({
      "leave_management.allocate_balance": true,
      "leave_management.view": false,
    })).toEqual([
      expect.objectContaining({
        permission: "leave_management.allocate_balance",
        requiredPermission: "leave_management.view",
      }),
    ]);
  });

  it("allows independent modules when Employees is off", () => {
    expect(validatePermissionSelection({
      "employees.view": false,
      "attendance.view": true,
      "leave_management.view": true,
      "payroll.view": true,
      "expenses.view": true,
    })).toEqual([]);
  });

  it("reports every invalid combination together", () => {
    const errors = validatePermissionSelection({
      "employees.create": true,
      "employees.edit": true,
      "payroll.generate": true,
      "leave_management.allocate_balance": true,
    });
    expect(new Set(errors.map((error) => error.permission))).toEqual(new Set([
      "employees.create",
      "employees.edit",
      "payroll.generate",
      "leave_management.allocate_balance",
    ]));
  });

  it("allows saving after all required permissions are restored", () => {
    expect(validatePermissionSelection({
      "employees.create": true,
      "employees.view": true,
      "payroll.generate": true,
      "payroll.view": true,
    })).toEqual([]);
  });

  it("does not treat data scope changes as permission changes", () => {
    expect(validatePermissionSelection({
      "assets.view": true,
      "assets.create": true,
    })).toEqual([]);
  });
});
