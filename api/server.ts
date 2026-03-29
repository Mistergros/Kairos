import { createServer } from "http";
import { URL } from "url";
import path from "path";
import crypto from "crypto";
import Stripe from "stripe";
import { clerkClient } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { query } from "../apps/web/server/db.js";
import RiskEngineV4 from "../src/core/engine/risk-engine.server.js";

const PORT = Number(process.env.API_PORT || 8787);
const engineV4 = new RiskEngineV4(path.join(process.cwd(), "config"));
const API_VERSIONS = ["v1"];
const DEFAULT_API_VERSION = "v1";
const RATE_LIMIT = Number(process.env.API_RATE_LIMIT || 0); // requêtes par minute, 0 = désactivé
type Role = "admin" | "manager" | "contrib" | "viewer";
const ALLOWED_ORIGINS = (process.env.API_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/landing?checkout=success";
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL || "http://localhost:5173/landing?checkout=cancel";
const STRIPE_PORTAL_RETURN_URL = process.env.STRIPE_PORTAL_RETURN_URL || "http://localhost:5173/mon-compte";
const STRIPE_PRICE_ID_ESSENTIAL = process.env.STRIPE_PRICE_ID_ESSENTIAL;
const STRIPE_PRICE_ID_CONSULTANTS = process.env.STRIPE_PRICE_ID_CONSULTANTS;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const clerkEnabled = Boolean(CLERK_SECRET_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@kaijos.fr";

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

const getStripePriceId = (planId?: string | null) => {
  const plan = (planId || "").toLowerCase();
  if (plan === "consultants") return STRIPE_PRICE_ID_CONSULTANTS || STRIPE_PRICE_ID_ESSENTIAL;
  return STRIPE_PRICE_ID_ESSENTIAL || STRIPE_PRICE_ID_CONSULTANTS;
};

const readRawBody = async (req: any) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const mergePublicMetadata = async (userId: string, patch: Record<string, any>) => {
  const user = await clerkClient.users.getUser(userId);
  const current = (user.publicMetadata || {}) as Record<string, any>;
  await clerkClient.users.updateUser(userId, { publicMetadata: { ...current, ...patch } });
};

const getClerkUserByEmail = async (email: string) => {
  const list = await clerkClient.users.getUserList({ emailAddress: [email] });
  return list[0] || null;
};

const resolveClerkUserIdFromCustomer = async (customerId: string | null) => {
  if (!stripe || !customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer && !Array.isArray(customer)) {
    const metadata = (customer.metadata || {}) as Record<string, string>;
    return metadata.clerkUserId || metadata.clerk_user_id || null;
  }
  return null;
};

const ensureClerkUser = async (email?: string | null, preferredId?: string | null) => {
  if (!clerkEnabled) return null;
  if (preferredId) {
    try {
      return await clerkClient.users.getUser(preferredId);
    } catch {
      // fallback to email lookup
    }
  }
  if (!email) return null;
  const existing = await getClerkUserByEmail(email);
  if (existing) return existing;
  return clerkClient.users.createUser({ emailAddress: [email] });
};

const setStripeCustomerClerkId = async (customerId: string, clerkUserId: string) => {
  if (!stripe) return;
  await stripe.customers.update(customerId, { metadata: { clerkUserId } });
};

const normalizeSubscriptionStatus = (status: string) => {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled") return "canceled";
  if (status === "past_due") return "past_due";
  if (status === "unpaid") return "unpaid";
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete";
  return status;
};

const handleStripeCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  if (!clerkEnabled) throw new Error("Clerk not configured");
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
  const email = session.customer_email || session.customer_details?.email || null;
  const sessionClerkUserId =
    (session.client_reference_id as string | null) || (session.metadata?.clerkUserId as string | undefined) || null;
  const user = await ensureClerkUser(email, sessionClerkUserId);
  if (!user) {
    console.warn("[Stripe] No Clerk user resolved for checkout session", session.id);
    return;
  }
  const clerkUserId = user.id;
  if (customerId) {
    await setStripeCustomerClerkId(customerId, clerkUserId);
  }
  const planId = (session.metadata?.planId as string | undefined) || (session.metadata?.plan as string | undefined) || "pro";
  const patch: Record<string, any> = {
    subscriptionStatus: "active",
    planId,
    lastStripeEvent: "checkout.session.completed",
  };
  if (customerId) patch.stripeCustomerId = customerId;
  if (subscriptionId) patch.stripeSubscriptionId = subscriptionId;
  await mergePublicMetadata(clerkUserId, patch);
};

const handleStripeSubscriptionEvent = async (subscription: Stripe.Subscription, eventType: string) => {
  if (!clerkEnabled) throw new Error("Clerk not configured");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null;
  const metadata = (subscription.metadata || {}) as Record<string, string>;
  const clerkUserId = metadata.clerkUserId || metadata.clerk_user_id || (await resolveClerkUserIdFromCustomer(customerId));
  if (!clerkUserId) {
    console.warn("[Stripe] No Clerk user resolved for subscription event", subscription.id);
    return;
  }
  const status = eventType === "customer.subscription.deleted" ? "canceled" : normalizeSubscriptionStatus(subscription.status);
  const patch: Record<string, any> = {
    subscriptionStatus: status,
    stripeSubscriptionId: subscription.id,
    lastStripeEvent: eventType,
  };
  if (customerId) patch.stripeCustomerId = customerId;
  await mergePublicMetadata(clerkUserId, patch);
};

const handleStripeInvoiceFailed = async (invoice: Stripe.Invoice) => {
  if (!clerkEnabled) throw new Error("Clerk not configured");
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
  const clerkUserId = await resolveClerkUserIdFromCustomer(customerId);
  if (!clerkUserId) {
    console.warn("[Stripe] No Clerk user resolved for invoice failure", invoice.id);
    return;
  }
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id || null;
  const patch: Record<string, any> = {
    subscriptionStatus: "past_due",
    lastStripeEvent: "invoice.payment_failed",
  };
  if (customerId) patch.stripeCustomerId = customerId;
  if (subscriptionId) patch.stripeSubscriptionId = subscriptionId;
  await mergePublicMetadata(clerkUserId, patch);
};

const handleStripeInvoicePaid = async (invoice: Stripe.Invoice) => {
  if (!clerkEnabled) throw new Error("Clerk not configured");
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
  const clerkUserId = await resolveClerkUserIdFromCustomer(customerId);
  if (!clerkUserId) {
    console.warn("[Stripe] No Clerk user resolved for invoice payment", invoice.id);
    return;
  }
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id || null;
  const patch: Record<string, any> = {
    subscriptionStatus: "active",
    lastStripeEvent: "invoice.payment_succeeded",
  };
  if (customerId) patch.stripeCustomerId = customerId;
  if (subscriptionId) patch.stripeSubscriptionId = subscriptionId;
  await mergePublicMetadata(clerkUserId, patch);
};

const handleStripeEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed":
      await handleStripeCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.deleted":
    case "customer.subscription.updated":
      await handleStripeSubscriptionEvent(event.data.object as Stripe.Subscription, event.type);
      break;
    case "invoice.payment_failed":
      await handleStripeInvoiceFailed(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_succeeded":
      await handleStripeInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
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
    const originAllowed = !origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
    (res as any)._origin = originAllowed ? origin || "*" : undefined;

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

    if (req.method === "POST" && basePath === "/api/webhooks/stripe") {
      if (!stripe || !STRIPE_WEBHOOK_SECRET) return json(res, { error: "Stripe not configured" }, 500);
      const signature = req.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") return json(res, { error: "Missing Stripe signature" }, 400);
      const payload = await readRawBody(req).catch(() => null);
      if (!payload) return json(res, { error: "Empty body" }, 400);
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("[Stripe] Webhook signature error", err);
        return json(res, { error: "Invalid signature" }, 400);
      }
      try {
        await handleStripeEvent(event);
      } catch (err) {
        console.error("[Stripe] Webhook handling failed", err);
        return json(res, { error: "Webhook handling failed" }, 500);
      }
      return json(res, { received: true });
    }

    if (req.method === "POST" && basePath === "/api/checkout-sessions") {
      if (!stripe) return json(res, { error: "Stripe not configured" }, 500);
      const body = await readBody(req).catch(() => null);
      const planId = typeof body?.planId === "string" ? body.planId : typeof body?.plan === "string" ? body.plan : null;
      const priceId = (typeof body?.priceId === "string" && body.priceId) || getStripePriceId(planId);
      if (!priceId) return json(res, { error: "Stripe price not configured" }, 500);
      const customerEmail = typeof body?.email === "string" ? body.email : undefined;
      const clerkUserId = typeof body?.clerkUserId === "string" ? body.clerkUserId : undefined;
      const successUrl = typeof body?.successUrl === "string" ? body.successUrl : STRIPE_SUCCESS_URL;
      const cancelUrl = typeof body?.cancelUrl === "string" ? body.cancelUrl : STRIPE_CANCEL_URL;
      let customerId: string | undefined;

      if (clerkUserId && clerkEnabled) {
        try {
          const user = await clerkClient.users.getUser(clerkUserId);
          const metadata = (user.publicMetadata || {}) as Record<string, any>;
          if (typeof metadata.stripeCustomerId === "string") {
            customerId = metadata.stripeCustomerId;
          }
        } catch {
          // ignore lookup errors and fallback to email checkout
        }
      }

      const metadata: Record<string, string> = {};
      if (clerkUserId) metadata.clerkUserId = clerkUserId;
      if (planId) metadata.planId = planId;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        ...(customerId ? { customer: customerId } : customerEmail ? { customer_email: customerEmail } : {}),
        ...(clerkUserId ? { client_reference_id: clerkUserId } : {}),
        ...(Object.keys(metadata).length ? { metadata, subscription_data: { metadata } } : {}),
      });

      return json(res, { url: session.url, id: session.id });
    }

    if (req.method === "POST" && basePath === "/api/customer-portal") {
      if (!stripe) return json(res, { error: "Stripe not configured" }, 500);
      if (!clerkEnabled) return json(res, { error: "Clerk not configured" }, 500);
      const body = await readBody(req).catch(() => null);
      const clerkUserId = typeof body?.clerkUserId === "string" ? body.clerkUserId : null;
      if (!clerkUserId) return json(res, { error: "Missing clerkUserId" }, 400);
      const user = await clerkClient.users.getUser(clerkUserId).catch(() => null);
      if (!user) return json(res, { error: "User not found" }, 404);
      const metadata = (user.publicMetadata || {}) as Record<string, any>;
      const customerId = typeof metadata.stripeCustomerId === "string" ? metadata.stripeCustomerId : null;
      if (!customerId) return json(res, { error: "Stripe customer not linked" }, 400);
      const returnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : STRIPE_PORTAL_RETURN_URL;
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
      return json(res, { url: session.url });
    }

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

    // ── RECHERCHE ENTREPRISES (INSEE) ───────────────────────────────────────
    if (req.method === "GET" && basePath === "/api/companies/search") {
      const q = url.searchParams.get("q") || "";
      if (q.length < 3) return json(res, []);
      try {
        const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&nombre=10`;
        const apiRes = await fetch(apiUrl);
        const data = await apiRes.json() as any;
        const results = (data.results || []).map((r: any) => ({
          id: r.siren,
          name: r.nom_raison_sociale || r.nom_complet,
          siren: r.siren,
          siret: r.siege?.siret,
          naf: r.activite_principale,
          address: r.siege?.adresse,
          city: r.siege?.libelle_commune,
          postalCode: r.siege?.code_postal,
        }));
        return json(res, results);
      } catch (err) {
        return error(res, err);
      }
    }

    // ── COLLABORATEURS ──────────────────────────────────────────────────────
    if (req.method === "GET" && basePath === "/api/invites") {
      const clerkUserId = url.searchParams.get("clerkUserId");
      if (!clerkUserId) return json(res, { error: "clerkUserId required" }, 400);
      try {
        const rows = await query(
          "SELECT id, invitee_email, role, status, created_at FROM invitations WHERE owner_clerk_id = $1 ORDER BY created_at DESC",
          [clerkUserId]
        ).catch(() => ({ rows: [] as any[] }));
        return json(res, { invites: rows.rows });
      } catch {
        return json(res, { invites: [] });
      }
    }

    if (req.method === "POST" && basePath === "/api/invites") {
      const body = await readBody(req).catch(() => null);
      if (!body?.ownerClerkId || !body?.email) return json(res, { error: "Bad Request" }, 400);

      // Persist in DB
      try {
        await query(
          `INSERT INTO invitations (id, owner_clerk_id, invitee_email, role, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'pending', NOW())
           ON CONFLICT (owner_clerk_id, invitee_email) DO UPDATE SET status = 'pending', role = $3`,
          [body.ownerClerkId, body.email.toLowerCase(), body.role || "viewer"]
        );
      } catch (dbErr) {
        console.warn("[invites] DB unavailable, email-only fallback:", dbErr);
      }

      // Send invitation email if Resend configured
      if (RESEND_API_KEY) {
        const appUrl = process.env.APP_URL || "http://localhost:5173";
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#5B61F6,#00B3FF);padding:28px 32px;border-radius:12px 12px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Invitation Kaijos</h1>
            </div>
            <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
              <p style="font-size:15px;color:#1e293b">Bonjour,</p>
              <p style="font-size:15px;color:#1e293b">
                <strong>${body.ownerName || "Un utilisateur"}</strong> vous invite à collaborer
                sur le DUERP de <strong>${body.establishmentName || "son établissement"}</strong> sur Kaijos.
              </p>
              <a href="${appUrl}/sign-up"
                 style="display:inline-block;margin-top:16px;background:#5B61F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                Créer mon compte →
              </a>
              <p style="margin-top:24px;font-size:12px;color:#94a3b8">
                Connectez-vous avec cette adresse email (${body.email}) pour accéder au projet partagé.
              </p>
            </div>
          </div>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [body.email],
            subject: `[Kaijos] Invitation à collaborer — ${body.establishmentName || "DUERP"}`,
            html,
          }),
        }).catch((e) => console.error("[invites] email error:", e));
      }
      return json(res, { ok: true });
    }

    if (req.method === "POST" && basePath === "/api/invites/revoke") {
      const body = await readBody(req).catch(() => null);
      if (!body?.ownerClerkId || !body?.email) return json(res, { error: "Bad Request" }, 400);
      await query(
        "DELETE FROM invitations WHERE owner_clerk_id = $1 AND invitee_email = $2",
        [body.ownerClerkId, body.email.toLowerCase()]
      ).catch(() => null);
      return json(res, { ok: true });
    }

    // ── RAPPEL RÉVISION ANNUELLE ─────────────────────────────────────────────
    if (req.method === "POST" && basePath === "/api/reminders/send") {
      const body = await readBody(req).catch(() => null);
      if (!body?.to || !body?.establishmentName) return json(res, { error: "Bad Request" }, 400);
      if (!RESEND_API_KEY) return json(res, { error: "Email service non configuré" }, 503);

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#5B61F6,#00B3FF);padding:28px 32px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Kaijos — Rappel DUERP</h1>
          </div>
          <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
            <p style="font-size:15px;color:#1e293b">Bonjour,</p>
            <p style="font-size:15px;color:#1e293b">
              Le DUERP de l'établissement <strong>${body.establishmentName}</strong>
              ${body.monthsOld ? `n'a pas été mis à jour depuis <strong>${body.monthsOld} mois</strong>` : "approche de son délai de révision annuelle"}.
            </p>
            <p style="font-size:14px;color:#64748b">
              Le Code du travail (art. R.4121-2) impose une mise à jour au moins annuelle.
              Une révision est recommandée avant d'atteindre 12 mois.
            </p>
            <a href="${process.env.APP_URL || "http://localhost:5173"}/versions"
               style="display:inline-block;margin-top:16px;background:#5B61F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Créer une nouvelle version →
            </a>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8">Kaijos by Milante Consulting</p>
          </div>
        </div>`;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [body.to],
            subject: `[Kaijos] Révision DUERP — ${body.establishmentName}`,
            html,
          }),
        });
        if (!resendRes.ok) {
          const txt = await resendRes.text().catch(() => "");
          console.error("[reminders] Resend error:", txt);
          return json(res, { error: "Envoi échoué" }, 502);
        }
        return json(res, { ok: true });
      } catch (e) {
        console.error("[reminders]", e);
        return json(res, { error: "Envoi échoué" }, 502);
      }
    }

    notFound(res);
  } catch (err) {
    error(res, err);
  }
}).listen(PORT, () => {
  console.log(`API DUERP en écoute sur http://localhost:${PORT}`);
});
