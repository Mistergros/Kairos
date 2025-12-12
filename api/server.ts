import { createServer } from "http";
import { URL } from "url";
import path from "path";
import crypto from "crypto";
import { query } from "../apps/web/server/db.js";
import { generateAssistResponse } from "../src/ai/assistant.logic.js";
import RiskEngineV4 from "../src/core/engine/risk-engine.v4.js";

const PORT = Number(process.env.API_PORT || 8787);
const engineV4 = new RiskEngineV4(path.join(process.cwd(), "config"));
const API_VERSIONS = ["v1"];
const DEFAULT_API_VERSION = "v1";
const RATE_LIMIT = Number(process.env.API_RATE_LIMIT || 0); // requêtes par minute, 0 = désactivé
type Role = "admin" | "manager" | "contrib" | "viewer";
const ALLOWED_ORIGINS = (process.env.API_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const ENABLE_IA_V2 = process.env.DUERP_ENABLE_IA_V2 === "true";

const json = (res: any, data: any, status = 200) => {
  const originHeader = (res as any)._origin;
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": originHeader || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  const duration = (res as any)._start ? Date.now() - (res as any)._start : undefined;
  if ((res as any)._path && (res as any)._method) {
    console.log(`[API] ${status} ${(res as any)._method} ${(res as any)._path} ${duration !== undefined ? duration + "ms" : ""}`);
  }
  res.end(JSON.stringify(data));
};

const notFound = (res: any) => json(res, { error: "Not found" }, 404);
const error = (res: any, err: any) => {
  console.error(err);
  json(res, { error: "Internal error" }, 500);
};

const getRisks = async () => {
  const res = await query(
    `SELECT id, family, name, description, default_severity, default_frequency, default_mastery FROM risk ORDER BY name`
  );
  return res.rows;
};

const getActions = async () => {
  const res = await query(`SELECT id, type, label, details FROM action ORDER BY label`);
  return res.rows;
};

const getObligations = async () => {
  const res = await query(`SELECT id, source, title, reference, summary FROM obligation ORDER BY source, title`);
  return res.rows;
};

const getNafs = async (q?: string) => {
  if (q) {
    return (
      await query(
        `SELECT code, label, risk_tags FROM naf WHERE code ILIKE $1 OR label ILIKE $1 ORDER BY code LIMIT 100`,
        [`%${q}%`]
      )
    ).rows;
  }
  return (await query(`SELECT code, label, risk_tags FROM naf ORDER BY code LIMIT 200`)).rows;
};

const getNafDetail = async (code: string) => {
  const naf = await query(`SELECT code, label, risk_tags FROM naf WHERE code = $1`, [code]);
  if (naf.rowCount === 0) return null;
  const unitTemplates = await query(
    `SELECT id, name, description, default_risk_ids, suggested FROM unit_template WHERE naf_code = $1 ORDER BY suggested DESC, name ASC`,
    [code]
  );
  return { ...naf.rows[0], unit_templates: unitTemplates.rows };
};

const applyTenant = (tenantId: string | null, params: any[] = []) => {
  if (!tenantId) return { clause: "", params };
  return { clause: " WHERE tenant_id = $1", params: [tenantId, ...params] };
};

const getUnits = async (tenantId: string | null) => {
  const { clause, params } = applyTenant(tenantId);
  const sql = `SELECT id, company_id, tenant_id, name, description, headcount, naf_code FROM company_unit${clause} ORDER BY name`;
  const res = await query(sql, params);
  return res.rows;
};

const getAssessments = async (tenantId: string | null) => {
  const { clause, params } = applyTenant(tenantId);
  const sql = `SELECT id, unit_id, tenant_id, risk_id, context, existing_measures, severity, frequency, mastery, score FROM unit_risk_assessment${clause} ORDER BY score DESC NULLS LAST`;
  const res = await query(sql, params);
  return res.rows;
};

const getCorrectiveActions = async (tenantId: string | null) => {
  const { clause, params } = applyTenant(tenantId);
  const sql = `SELECT id, assessment_id, tenant_id, action_id, owner, due_date, status FROM corrective_action${clause} ORDER BY due_date NULLS LAST`;
  const res = await query(sql, params);
  const now = new Date().getTime();
  return res.rows.map((row: any) => {
    const due = row.due_date ? new Date(row.due_date).getTime() : null;
    const computed_status =
      due && row.status !== "done" && due < now ? "late" : row.status || "todo";
    return { ...row, computed_status };
  });
};

const upsertUnit = async (payload: any, tenantId: string | null) => {
  const id = payload.id || crypto.randomUUID();
  const sql = `
    INSERT INTO company_unit (id, company_id, tenant_id, name, description, headcount, naf_code)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, headcount=EXCLUDED.headcount, naf_code=EXCLUDED.naf_code, tenant_id=EXCLUDED.tenant_id
    RETURNING *`;
  const res = await query(sql, [
    id,
    payload.company_id || payload.companyId || crypto.randomUUID(),
    tenantId,
    payload.name,
    payload.description || null,
    payload.headcount ?? 0,
    payload.naf_code || payload.nafCode || null,
  ]);
  return res.rows[0];
};

const upsertAssessment = async (payload: any, tenantId: string | null) => {
  const id = payload.id || crypto.randomUUID();
  const sql = `
    INSERT INTO unit_risk_assessment (id, unit_id, tenant_id, risk_id, context, existing_measures, severity, frequency, mastery)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (id) DO UPDATE SET
      unit_id=EXCLUDED.unit_id,
      tenant_id=EXCLUDED.tenant_id,
      risk_id=EXCLUDED.risk_id,
      context=EXCLUDED.context,
      existing_measures=EXCLUDED.existing_measures,
      severity=EXCLUDED.severity,
      frequency=EXCLUDED.frequency,
      mastery=EXCLUDED.mastery
    RETURNING *`;
  const res = await query(sql, [
    id,
    payload.unit_id || payload.unitId,
    tenantId,
    payload.risk_id || payload.riskId,
    payload.context || null,
    payload.existing_measures || payload.existingMeasures || null,
    payload.severity,
    payload.frequency,
    payload.mastery,
  ]);
  return res.rows[0];
};

const upsertCorrectiveAction = async (payload: any, tenantId: string | null) => {
  const id = payload.id || crypto.randomUUID();
  const sql = `
    INSERT INTO corrective_action (id, assessment_id, tenant_id, action_id, owner, due_date, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (id) DO UPDATE SET
      assessment_id=EXCLUDED.assessment_id,
      tenant_id=EXCLUDED.tenant_id,
      action_id=EXCLUDED.action_id,
      owner=EXCLUDED.owner,
      due_date=EXCLUDED.due_date,
      status=EXCLUDED.status
    RETURNING *`;
  const res = await query(sql, [
    id,
    payload.assessment_id || payload.assessmentId,
    tenantId,
    payload.action_id || payload.actionId,
    payload.owner || null,
    payload.due_date || payload.dueDate || null,
    payload.status || "todo",
  ]);
  return res.rows[0];
};

const readBody = async (req: any) =>
  new Promise<any>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: any) => (body += chunk));
    req.on("end", () => {
      if (!body) return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });

const base64urlDecode = (input: string) => {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = 4 - (input.length % 4);
  if (pad !== 4) input += "=".repeat(pad);
  return Buffer.from(input, "base64").toString("utf-8");
};

const verifyJwt = (token: string, secret: string): any | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sig] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    return JSON.parse(base64urlDecode(payloadB64));
  } catch {
    return null;
  }
};

const getTenant = (req: any, authTenant?: string | null): string | null => {
  const tenantIdHeader = req.headers["x-tenant-id"] || req.headers["X-Tenant-Id"];
  if (typeof tenantIdHeader === "string" && tenantIdHeader.trim()) return tenantIdHeader.trim();
  return authTenant || null;
};

const roleTokens: Record<Role, string | undefined> = {
  admin: process.env.API_TOKEN_ADMIN,
  manager: process.env.API_TOKEN_MANAGER,
  contrib: process.env.API_TOKEN_CONTRIB,
  viewer: process.env.API_TOKEN_VIEW || process.env.API_TOKEN,
};

const rolesOrder: Role[] = ["viewer", "contrib", "manager", "admin"];

const authorize = (req: any): { ok: boolean; role?: Role; tenant?: string | null } => {
  const header = req.headers["authorization"] || req.headers["Authorization"];
  const anyTokenConfigured = Object.values(roleTokens).some(Boolean);
  const jwtSecret = process.env.API_JWT_SECRET;

  if (jwtSecret && header && typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    const payload = verifyJwt(token, jwtSecret);
    if (payload) {
      const role = (payload.role as Role) || "viewer";
      const tenant = (payload.tenant as string) || (payload.tid as string) || null;
      return { ok: true, role, tenant };
    }
  }

  if (!anyTokenConfigured) return { ok: true, role: "admin", tenant: null }; // aucune protection configuree
  if (!header || typeof header !== "string") return { ok: false };
  if (!header.startsWith("Bearer ")) return { ok: false };
  const provided = header.slice("Bearer ".length).trim();
  const role = (Object.entries(roleTokens).find(([, tok]) => tok && tok === provided)?.[0] as Role | undefined) || undefined;
  if (!role) return { ok: false };
  return { ok: true, role, tenant: null };
};

const requiresRole = (current: Role | undefined, required: Role): boolean => {
  if (!current) return false;
  return rolesOrder.indexOf(current) >= rolesOrder.indexOf(required);
};

const requireTenant = process.env.API_REQUIRE_TENANT === "true";

type RateBucket = { count: number; windowStart: number };
const rateStore = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60_000;

const rateLimited = (key: string) => {
  if (!RATE_LIMIT || RATE_LIMIT <= 0) return false;
  const now = Date.now();
  const bucket = rateStore.get(key) || { count: 0, windowStart: now };
  if (now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count += 1;
  rateStore.set(key, bucket);
  return bucket.count > RATE_LIMIT;
};

createServer(async (req, res) => {
  try {
    (res as any)._start = Date.now();
    (res as any)._method = req.method;
    (res as any)._path = req.url || "";

    if (!req.url) return notFound(res);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathName = url.pathname;

    const origin = (req.headers.origin as string | undefined)?.trim();
    const originAllowed = ALLOWED_ORIGINS.length === 0 || (origin && ALLOWED_ORIGINS.includes(origin));
    (res as any)._origin = originAllowed ? origin : ALLOWED_ORIGINS.length === 0 ? "*" : undefined;

    if (req.method === "OPTIONS") {
      if (!originAllowed) return json(res, { error: "CORS forbidden" }, 403);
      return json(res, { ok: true }, 200);
    }

    if (!originAllowed) return json(res, { error: "CORS forbidden" }, 403);

    const pathParts = pathName.split("/").filter(Boolean);
    const version = pathParts[0] && API_VERSIONS.includes(pathParts[0]) ? pathParts[0] : DEFAULT_API_VERSION;
    const baseIdx = version === DEFAULT_API_VERSION && pathParts[0] !== DEFAULT_API_VERSION ? 0 : 1;
    const basePath = "/" + pathParts.slice(baseIdx).join("/");

    const rateKey = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (rateLimited(rateKey)) return json(res, { error: "Too Many Requests" }, 429);

    const auth = authorize(req);

    if (req.method === "GET" && basePath === "/api/catalog/risks") {
      return json(res, await getRisks());
    }
    if (req.method === "GET" && basePath === "/api/catalog/actions") {
      return json(res, await getActions());
    }
    if (req.method === "GET" && basePath === "/api/catalog/obligations") {
      return json(res, await getObligations());
    }
    if (req.method === "GET" && basePath === "/api/nafs") {
      const q = (url.searchParams.get("q") || "").trim();
      return json(res, await getNafs(q || undefined));
    }
    if (req.method === "GET" && basePath.startsWith("/api/nafs/")) {
      const code = decodeURIComponent(basePath.replace("/api/nafs/", ""));
      const naf = await getNafDetail(code);
      if (!naf) return notFound(res);
      return json(res, naf);
    }

    if (req.method === "GET" && basePath === "/api/units") {
      if (!auth.ok || !requiresRole(auth.role, "viewer")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      return json(res, await getUnits(tenantId));
    }
    if (req.method === "POST" && basePath === "/api/units") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      const body = await readBody(req).catch(() => null);
      if (!body?.name) return json(res, { error: "Bad Request" }, 400);
      const created = await upsertUnit(body, tenantId);
      return json(res, created, 201);
    }
    if (req.method === "GET" && basePath === "/api/assessments") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      return json(res, await getAssessments(tenantId));
    }
    if (req.method === "POST" && basePath === "/api/assessments") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      const body = await readBody(req).catch(() => null);
      if (!body?.unit_id && !body?.unitId) return json(res, { error: "Bad Request" }, 400);
      if (!body?.risk_id && !body?.riskId) return json(res, { error: "Bad Request" }, 400);
      const created = await upsertAssessment(body, tenantId);
      return json(res, created, 201);
    }
    if (req.method === "GET" && basePath === "/api/actions-plan") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      return json(res, await getCorrectiveActions(tenantId));
    }
    if (req.method === "POST" && basePath === "/api/actions-plan") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      const body = await readBody(req).catch(() => null);
      if (!body?.assessment_id && !body?.assessmentId) return json(res, { error: "Bad Request" }, 400);
      const created = await upsertCorrectiveAction(body, tenantId);
      return json(res, created, 201);
    }

    if (req.method === "POST" && basePath === "/api/assist") {
      if (!ENABLE_IA_V2) return json(res, { error: "IA assist disabled" }, 403);
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      const body = await readBody(req).catch(() => null);
      if (!body) return json(res, { error: "Bad Request" }, 400);
      const risks = Array.isArray(body.risks)
        ? body.risks.map((r: any) => ({
            id: r.id || r.riskId,
            label: r.label || r.name || r.riskLabel,
            category: r.category,
            severity: r.severity,
            frequency: r.frequency,
            mastery: r.mastery,
            context: r.context,
          }))
        : [];
      const resp = await generateAssistResponse({
        nafCode: body.nafCode || body.naf || body.codeNaf,
        unitName: body.unitName || body.unit || body.workUnit,
        activity: body.activity || body.unitActivity || "",
        freeText: body.freeText || body.note || "",
        risks,
      });
      return json(res, { ...resp, tenantId: tenantId || undefined });
    }

    if (req.method === "POST" && basePath === "/api/evaluate") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      const body = await readBody(req).catch(() => null);
      if (!body) return json(res, { error: "Bad Request" }, 400);
      const ctx = body.ctx || body;
      const nafCode = ctx.nafCode || ctx.naf || "";
      const unity = ctx.unity || "";
      const risks = engineV4.getRisksFor(nafCode, unity, ctx);
      const evaluations = risks.map((r) => engineV4.evaluateRisk(r, ctx));
      const plan = engineV4.generateActionPlan(evaluations, nafCode, ctx);
      const obligations = engineV4.matchObligations(nafCode, ctx);
      return json(res, { risks, evaluations, plan, obligations, tenantId: tenantId || undefined });
    }

    if (req.method === "POST" && basePath === "/api/compliance") {
      if (!auth.ok || !requiresRole(auth.role, "contrib")) return json(res, { error: "Unauthorized" }, 401);
      const tenantId = getTenant(req, auth.tenant);
      if (requireTenant && !tenantId) return json(res, { error: "Tenant required" }, 400);
      const body = await readBody(req).catch(() => null);
      if (!body) return json(res, { error: "Bad Request" }, 400);
      const ctx = body.ctx || body;
      const nafCode = ctx.nafCode || ctx.naf || "";
      const obligations = engineV4.matchObligations(nafCode, ctx).map((o) => ({
        ...o,
        status: "pending",
      }));
      return json(res, { obligations, tenantId: tenantId || undefined });
    }

    notFound(res);
  } catch (err) {
    error(res, err);
  }
}).listen(PORT, () => {
  console.log(`API DUERP en écoute sur http://localhost:${PORT}`);
});
