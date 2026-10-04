import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Frontend-side guarantees for the assets module.
 *
 * These are the mistakes type checking cannot catch, because each one is a
 * perfectly valid value in its own right:
 *
 *  1. SENDING `status` FROM THE CLIENT. The server derives status and ignores
 *     anything posted, so a status field on a payload is a control the user can
 *     move that silently does nothing - the worst kind of bug, because it looks
 *     like it worked.
 *
 *  2. AN ACTION THE SERVER WILL REFUSE. A menu offering "Assign" on a retired
 *     asset teaches people the page is broken.
 *
 *  3. FILE HANDLING. Receipts and invoices are attachment entities uploaded as
 *     multipart. A JSON POST of a File object would upload the string
 *     "[object File]" and still report success.
 */
const ASSETS_PAGE = readFileSync("src/routes/_app.org.assets.tsx", "utf8");
const CATEGORIES_PAGE = readFileSync("src/routes/_app.org.asset-categories.tsx", "utf8");
const SERVICE = readFileSync("src/services/assets.ts", "utf8");
const NAV = readFileSync("src/lib/navItems.ts", "utf8");
const ACCESS = readFileSync("src/lib/routeAccess.ts", "utf8");
const UTILS = readFileSync("src/lib/utils.ts", "utf8");

/** Code with block and line comments stripped, so prose cannot satisfy an assertion. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

/**
 * One member of a NAMED service object.
 *
 * Scoping to the object matters: assets.ts defines both assetCategoriesService
 * and assetsService, and both have a `create`. An unscoped search finds the
 * categories one first, so the assertion quietly validated the wrong service and
 * passed no matter what assetsService did — a test that can never fail is worse
 * than no test.
 */
function member(objSrc: string, name: string): string {
  const start = objSrc.search(new RegExp(`^  ${name}:`, "m"));
  if (start === -1) return "";
  const rest = objSrc.slice(start + 1);
  const next = rest.search(/^ {2}[a-zA-Z]/m);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

/** The body of a `export const <name> = { ... };` declaration, up to the next one. */
function serviceBlock(src: string, name: string): string {
  const at = src.indexOf(`export const ${name} = {`);
  if (at === -1) return "";
  const rest = src.slice(at);
  const next = rest.search(/\n};\n/);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("assets client never sends status", () => {
  const ASSETS = serviceBlock(code(SERVICE), "assetsService");

  it("the assets service block was found", () => {
    // A failed lookup would make every member() below return "" and the
    // assertions vacuously pass.
    expect(ASSETS.length).toBeGreaterThan(500);
    expect(ASSETS).toContain("list:");
    expect(ASSETS).toContain("assign:");
  });

  it("create takes no status", () => {
    const body = member(ASSETS, "create");
    expect(body.length, "assetsService.create not found").toBeGreaterThan(50);
    expect(body).not.toMatch(/\bstatus\b/);
  });

  it("update takes no status", () => {
    const body = member(ASSETS, "update");
    expect(body.length, "assetsService.update not found").toBeGreaterThan(50);
    expect(body).not.toMatch(/\bstatus\b/);
  });

  it("no REQUEST body sends status, only the response type declares it", () => {
    // Scoped to inline POST bodies (assign/return/retire build theirs as object
    // literals). create/update take a `data` parameter instead, so those are
    // covered by the two tests above; a regex over the whole file would also
    // match the RESPONSE types, which legitimately contain status.
    const posts = [...ASSETS.matchAll(/\.post(?:<[^>]*>)?\([^,]+,\s*(\{[\s\S]*?\})/g)];
    expect(posts.length, "expected inline POST bodies").toBeGreaterThan(0);
    for (const [, body] of posts) {
      expect(body, `a POST body sends status: ${body.slice(0, 60)}`).not.toMatch(/\bstatus\s*:/);
    }
    expect(ASSETS).toContain("status: AssetStatus");
  });
});

describe("file uploads", () => {
  it("uploadReceipts posts multipart FormData", () => {
    const body = member(code(SERVICE), "uploadReceipts");
    expect(body).toContain("new FormData()");
    expect(body).toContain("multipart/form-data");
  });

  it("uploadInvoices posts multipart FormData", () => {
    const body = member(code(SERVICE), "uploadInvoices");
    expect(body).toContain("new FormData()");
    expect(body).toContain("multipart/form-data");
  });

  it("routes files to the attachment endpoints, never a path field", () => {
    expect(SERVICE).toContain("/org/assets/${uuid}/receipts");
    expect(SERVICE).toContain("/org/asset-maintenance/${jobUuid}/invoices");
    expect(code(SERVICE)).not.toMatch(/receipt_path|invoice_path/);
  });

  it("the page renders an attachment size with the shared formatter", () => {
    expect(ASSETS_PAGE).toContain("formatFileSize(");
    expect(ASSETS_PAGE).not.toMatch(/file_size\s*\/\s*1024/);
  });
});

describe("asset actions match the server's transitions", () => {
  /** The JSX branch RowActions takes for a status, matched as its own test. */
  function branchFor(status: string): string {
    // `row.status === "assigned" ||` also contains the needle, so require the
    // standalone ternary form. Without that, the first hit is the
    // "available OR assigned" edit branch and the slice is the wrong one.
    const needle = `{row.status === "${status}" ? (`;
    const at = ASSETS_PAGE.indexOf(needle);
    if (at === -1) return "";
    const rest = ASSETS_PAGE.slice(at + needle.length);
    const next = rest.indexOf('{row.status === "');
    return next > 0 ? rest.slice(0, next) : rest.slice(0, 700);
  }

  it("offers Assign and Send for maintenance only when available", () => {
    const branch = branchFor("available");
    expect(branch.length, "available branch not found").toBeGreaterThan(40);
    expect(branch).toContain("assets.assign");
    expect(branch).toContain("assets.sendForMaintenance");
  });

  it("offers Return only when assigned", () => {
    const branch = branchFor("assigned");
    expect(branch.length, "assigned branch not found").toBeGreaterThan(20);
    expect(branch).toContain("assets.returnAsset");
  });

  it("shows a placeholder, not an action, while an asset is in maintenance", () => {
    // Assigning or returning something on a repair bench would 409. The honest
    // option is to say why nothing is available.
    expect(branchFor("maintenance")).toContain("assets.inMaintenance");
    expect(branchFor("maintenance")).not.toContain("assets.assign");
  });

  it("offers Reinstate for retired instead of Assign or Return", () => {
    const idx = ASSETS_PAGE.indexOf('row.status !== "retired"');
    expect(idx).toBeGreaterThan(-1);
    const tail = ASSETS_PAGE.slice(idx, idx + 600);
    expect(tail).toContain("assets.reinstate");
    expect(tail).not.toContain("assets.assign");
    expect(tail).not.toContain("assets.returnAsset");
  });

  it("keeps the row click from also opening the drawer behind the menu", () => {
    expect(ASSETS_PAGE).toMatch(/onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
  });
});

describe("asset category page", () => {
  it("disables delete on a category that still holds assets", () => {
    expect(CATEGORIES_PAGE).toMatch(/disabled=\{\(r\.asset_count \?\? 0\) > 0\}/);
  });

  it("surfaces a failed delete instead of closing as if it worked", () => {
    expect(CATEGORIES_PAGE).toContain("apiErrorMessage(remove.error");
  });

  it("resets the form on open, so New is not a silent overwrite", () => {
    expect(CATEGORIES_PAGE).toMatch(/wasOpen\.current/);
    expect(CATEGORIES_PAGE).toMatch(/reset\(/);
  });
});

describe("navigation and access control", () => {
  it("exposes both pages in the sidebar", () => {
    expect(NAV).toContain('to: "/org/assets"');
    expect(NAV).toContain('to: "/org/asset-categories"');
  });

  it("has a route-access row for both, or the sidebar links go nowhere", () => {
    expect(ACCESS).toContain('"/org/assets"');
    expect(ACCESS).toContain('"/org/asset-categories"');
  });

  it("lets staff move stock but reserves category admin for org_admin", () => {
    // Mirrors the backend's assetMgmt versus assetCategoryMgmt.
    expect(ACCESS).toMatch(/"\/org\/assets":\s*\{\s*roles:\s*STAFF_ROLES\s*\}/);
    expect(ACCESS).toMatch(/"\/org\/asset-categories":\s*\{\s*roles:\s*\["org_admin"\]\s*\}/);
  });

  it("uses module_flags for plan entitlement, not a per-user feature key", () => {
    const from = ACCESS.indexOf("/org/assets");
    const block = ACCESS.slice(Math.max(0, from - 500), from + 300);
    expect(block).not.toMatch(/feature:\s*"asset/);
  });

  it("wraps both pages in the ModuleGate for asset_management", () => {
    expect(ASSETS_PAGE).toContain('<ModuleGate module="asset_management">');
    expect(CATEGORIES_PAGE).toContain('<ModuleGate module="asset_management">');
  });
});

describe("money and date formatting", () => {
  it("never formats a cost with the date formatter", () => {
    expect(ASSETS_PAGE).not.toMatch(/formatDateTime\([^)]*cost/);
    expect(ASSETS_PAGE).toContain("formatCurrency(");
  });

  it("renders a nullish cost as a dash, not 0", () => {
    // 0 would assert a price nobody entered, and reads as a real figure in a
    // total column.
    expect(UTILS).toMatch(/value === null \|\| value === undefined[\s\S]{0,60}return "—"/);
  });

  it("the currency formatter accepts a string, because DECIMAL arrives as one", () => {
    // Whitespace-insensitive on purpose: prettier may put `value?` on its own
    // line, and a test that fails on formatting is a test that gets deleted.
    expect(UTILS.replace(/\s+/g, " ")).toMatch(
      /formatCurrency\(\s*value\?: number \| string \| null/,
    );
  });
});
