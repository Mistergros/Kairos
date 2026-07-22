import { createServer } from "http";
import { URL } from "url";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Stripe from "stripe";
import { clerkClient, verifyToken } from "@clerk/clerk-sdk-node";
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
const STRIPE_PRICE_ID_STARTER          = process.env.STRIPE_PRICE_ID_STARTER;
const STRIPE_PRICE_ID_STARTER_ANNUAL   = process.env.STRIPE_PRICE_ID_STARTER_ANNUAL;
const STRIPE_PRICE_ID_PME              = process.env.STRIPE_PRICE_ID_PME;
const STRIPE_PRICE_ID_PME_ANNUAL       = process.env.STRIPE_PRICE_ID_PME_ANNUAL;
const STRIPE_PRICE_ID_CONSULTANTS      = process.env.STRIPE_PRICE_ID_CONSULTANTS;
const STRIPE_PRICE_ID_CONSULTANTS_ANNUAL = process.env.STRIPE_PRICE_ID_CONSULTANTS_ANNUAL;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const clerkEnabled = Boolean(CLERK_SECRET_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@kaijos.com";

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

const getStripePriceId = (planId?: string | null, billing?: string | null) => {
  const plan = (planId || "starter").toLowerCase();
  const isAnnual = billing === "annual";
  if (plan === "consultants") return isAnnual ? (STRIPE_PRICE_ID_CONSULTANTS_ANNUAL || STRIPE_PRICE_ID_CONSULTANTS) : STRIPE_PRICE_ID_CONSULTANTS;
  if (plan === "pme")         return isAnnual ? (STRIPE_PRICE_ID_PME_ANNUAL || STRIPE_PRICE_ID_PME) : STRIPE_PRICE_ID_PME;
  // starter (default)
  return isAnnual ? (STRIPE_PRICE_ID_STARTER_ANNUAL || STRIPE_PRICE_ID_STARTER) : STRIPE_PRICE_ID_STARTER;
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
  const planId = (session.metadata?.planId as string | undefined) || (session.metadata?.plan as string | undefined) || "starter";
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

// --- App data (establishments/work_units/assessments/actions/versions) ---
// Consolidated onto Neon, scoped by the real Clerk user id (orgId), replacing
// the old company_unit/unit_risk_assessment/corrective_action routes (dead:
// nothing in src/ ever called them) and the direct browser->Supabase writes.

const listEstablishmentsDb = async (orgId: string) => {
  const res = await query(
    `SELECT id, name, siren, siret, code_naf, sector, address, headcount FROM establishments WHERE org_id=$1 ORDER BY name`,
    [orgId]
  );
  return res.rows;
};
const upsertEstablishmentDb = async (orgId: string, e: any) => {
  const res = await query(
    `INSERT INTO establishments (id, org_id, name, siren, siret, code_naf, sector, address, headcount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, siren=EXCLUDED.siren, siret=EXCLUDED.siret,
       code_naf=EXCLUDED.code_naf, sector=EXCLUDED.sector, address=EXCLUDED.address, headcount=EXCLUDED.headcount
     WHERE establishments.org_id = $2
     RETURNING *`,
    [e.id, orgId, e.name, e.siren ?? null, e.siret ?? null, e.codeNaf ?? null, e.sector ?? null, e.address ?? null, e.headcount ?? null]
  );
  return res.rows[0];
};
const deleteEstablishmentDb = async (orgId: string, id: string) => {
  await query(`DELETE FROM establishments WHERE id=$1 AND org_id=$2`, [id, orgId]);
};

const listWorkUnitsDb = async (orgId: string) => {
  const res = await query(
    `SELECT id, establishment_id, name, description, location, headcount, activity, features, tags, measurements FROM work_units WHERE org_id=$1 ORDER BY name`,
    [orgId]
  );
  return res.rows;
};
const upsertWorkUnitDb = async (orgId: string, u: any) => {
  const res = await query(
    `INSERT INTO work_units (id, org_id, establishment_id, name, description, location, headcount, activity, features, tags, measurements)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET establishment_id=EXCLUDED.establishment_id, name=EXCLUDED.name, description=EXCLUDED.description,
       location=EXCLUDED.location, headcount=EXCLUDED.headcount, activity=EXCLUDED.activity, features=EXCLUDED.features,
       tags=EXCLUDED.tags, measurements=EXCLUDED.measurements
     WHERE work_units.org_id = $2
     RETURNING *`,
    [u.id, orgId, u.establishmentId, u.name, u.description ?? null, u.location ?? null, u.headcount ?? null,
     u.activity ?? null, u.features ?? [], u.tags ?? [], JSON.stringify(u.measurements ?? {})]
  );
  return res.rows[0];
};
const deleteWorkUnitDb = async (orgId: string, id: string) => {
  await query(`DELETE FROM work_units WHERE id=$1 AND org_id=$2`, [id, orgId]);
};

const listAssessmentsDb = async (orgId: string) => {
  const res = await query(
    `SELECT id, work_unit_id, hazard_id, hazard_category, risk_label, damages, existing_measures, proposed_measures,
            gravity, frequency, control, score, priority, created_at, updated_at, source, source_url
     FROM assessments WHERE org_id=$1 ORDER BY created_at`,
    [orgId]
  );
  return res.rows;
};
const upsertAssessmentDb = async (orgId: string, a: any) => {
  const res = await query(
    `INSERT INTO assessments (id, org_id, work_unit_id, hazard_id, hazard_category, risk_label, damages,
       existing_measures, proposed_measures, gravity, frequency, control, score, priority, created_at, updated_at,
       source, source_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO UPDATE SET work_unit_id=EXCLUDED.work_unit_id, hazard_id=EXCLUDED.hazard_id,
       hazard_category=EXCLUDED.hazard_category, risk_label=EXCLUDED.risk_label, damages=EXCLUDED.damages,
       existing_measures=EXCLUDED.existing_measures, proposed_measures=EXCLUDED.proposed_measures,
       gravity=EXCLUDED.gravity, frequency=EXCLUDED.frequency, control=EXCLUDED.control, score=EXCLUDED.score,
       priority=EXCLUDED.priority, updated_at=EXCLUDED.updated_at, source=EXCLUDED.source, source_url=EXCLUDED.source_url
     WHERE assessments.org_id = $2
     RETURNING *`,
    [a.id, orgId, a.workUnitId, a.hazardId ?? null, a.hazardCategory ?? null, a.riskLabel ?? null, a.damages ?? null,
     a.existingMeasures ?? null, a.proposedMeasures ?? null, a.gravity, a.frequency, a.control, a.score, a.priority,
     a.createdAt ?? new Date().toISOString(), a.updatedAt ?? new Date().toISOString(), a.source ?? null, a.sourceUrl ?? null]
  );
  return res.rows[0];
};
const deleteAssessmentDb = async (orgId: string, id: string) => {
  await query(`DELETE FROM assessments WHERE id=$1 AND org_id=$2`, [id, orgId]);
};

const listActionsDb = async (orgId: string) => {
  const res = await query(
    `SELECT id, establishment_id, assessment_id, title, description, owner, start_date, due_date, end_date, how,
            status, priority, cost, evidence_url, steps, created_at
     FROM actions WHERE org_id=$1 ORDER BY created_at`,
    [orgId]
  );
  return res.rows;
};
const upsertActionDb = async (orgId: string, a: any) => {
  const res = await query(
    `INSERT INTO actions (id, org_id, establishment_id, assessment_id, title, description, owner, start_date,
       due_date, end_date, how, status, priority, cost, evidence_url, steps, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (id) DO UPDATE SET establishment_id=EXCLUDED.establishment_id, assessment_id=EXCLUDED.assessment_id,
       title=EXCLUDED.title, description=EXCLUDED.description, owner=EXCLUDED.owner, start_date=EXCLUDED.start_date,
       due_date=EXCLUDED.due_date, end_date=EXCLUDED.end_date, how=EXCLUDED.how, status=EXCLUDED.status,
       priority=EXCLUDED.priority, cost=EXCLUDED.cost, evidence_url=EXCLUDED.evidence_url, steps=EXCLUDED.steps
     WHERE actions.org_id = $2
     RETURNING *`,
    [a.id, orgId, a.establishmentId ?? null, a.assessmentId ?? null, a.title, a.description ?? null, a.owner ?? null,
     a.startDate ?? null, a.dueDate ?? null, a.endDate ?? null, a.how ?? null, a.status ?? "TO_DO", a.priority ?? null,
     a.cost ?? null, a.evidenceUrl ?? null, JSON.stringify(a.steps ?? []), a.createdAt ?? new Date().toISOString()]
  );
  return res.rows[0];
};
const deleteActionDb = async (orgId: string, id: string) => {
  await query(`DELETE FROM actions WHERE id=$1 AND org_id=$2`, [id, orgId]);
};

const listVersionsDb = async (orgId: string) => {
  const res = await query(
    `SELECT id, establishment_id, label, reason, hash, snapshot, created_at FROM duerp_versions WHERE org_id=$1 ORDER BY created_at DESC`,
    [orgId]
  );
  return res.rows;
};
const upsertVersionDb = async (orgId: string, v: any) => {
  const res = await query(
    `INSERT INTO duerp_versions (id, org_id, establishment_id, label, reason, hash, snapshot, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, reason=EXCLUDED.reason, hash=EXCLUDED.hash, snapshot=EXCLUDED.snapshot
     WHERE duerp_versions.org_id = $2
     RETURNING *`,
    [v.id, orgId, v.establishmentId, v.label, v.reason ?? null, v.hash ?? null, v.snapshot ? JSON.stringify(v.snapshot) : null, v.createdAt ?? new Date().toISOString()]
  );
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

// Auth for the per-user app-data routes (establishments/work-units/assessments/
// actions/versions): a real Clerk session token, verified server-side, is the
// org scope — NOT the static shared API_TOKEN_* scheme above (that's for the
// public catalog/nafs/evaluate routes and would put every user in one bucket).
const clerkOrgCache = new Map<string, { orgId: string; expires: number }>();
const getClerkOrgId = async (req: any): Promise<string | null> => {
  const header = req.headers["authorization"] || req.headers["Authorization"];
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  const cached = clerkOrgCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.orgId;
  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const orgId = payload.sub;
    if (!orgId) return null;
    clerkOrgCache.set(token, { orgId, expires: Date.now() + 60_000 });
    return orgId;
  } catch {
    return null;
  }
};

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
      const billing = typeof body?.billing === "string" ? body.billing : null;
      const priceId = (typeof body?.priceId === "string" && body.priceId) || getStripePriceId(planId, billing);
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

    // --- App data: establishments / work-units / assessments / actions / versions ---
    // All scoped to the real signed-in Clerk user (see getClerkOrgId above).
    if (basePath === "/api/establishments" || basePath.startsWith("/api/establishments/")) {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      if (req.method === "GET") return json(res, await listEstablishmentsDb(orgId));
      if (req.method === "POST") {
        const body = await readBody(req).catch(() => null);
        if (!body?.id || !body?.name) return json(res, { error: "Bad Request" }, 400);
        return json(res, await upsertEstablishmentDb(orgId, body), 201);
      }
      if (req.method === "DELETE") {
        const id = decodeURIComponent(basePath.replace("/api/establishments/", ""));
        await deleteEstablishmentDb(orgId, id);
        return json(res, { ok: true });
      }
    }
    if (basePath === "/api/work-units" || basePath.startsWith("/api/work-units/")) {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      if (req.method === "GET") return json(res, await listWorkUnitsDb(orgId));
      if (req.method === "POST") {
        const body = await readBody(req).catch(() => null);
        if (!body?.id || !body?.name || !body?.establishmentId) return json(res, { error: "Bad Request" }, 400);
        return json(res, await upsertWorkUnitDb(orgId, body), 201);
      }
      if (req.method === "DELETE") {
        const id = decodeURIComponent(basePath.replace("/api/work-units/", ""));
        await deleteWorkUnitDb(orgId, id);
        return json(res, { ok: true });
      }
    }
    if (basePath === "/api/assessments" || basePath.startsWith("/api/assessments/")) {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      if (req.method === "GET") return json(res, await listAssessmentsDb(orgId));
      if (req.method === "POST") {
        const body = await readBody(req).catch(() => null);
        if (!body?.id || !body?.workUnitId) return json(res, { error: "Bad Request" }, 400);
        return json(res, await upsertAssessmentDb(orgId, body), 201);
      }
      if (req.method === "DELETE") {
        const id = decodeURIComponent(basePath.replace("/api/assessments/", ""));
        await deleteAssessmentDb(orgId, id);
        return json(res, { ok: true });
      }
    }
    if (basePath === "/api/actions" || basePath.startsWith("/api/actions/")) {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      if (req.method === "GET") return json(res, await listActionsDb(orgId));
      if (req.method === "POST") {
        const body = await readBody(req).catch(() => null);
        if (!body?.id || !body?.title) return json(res, { error: "Bad Request" }, 400);
        return json(res, await upsertActionDb(orgId, body), 201);
      }
      if (req.method === "DELETE") {
        const id = decodeURIComponent(basePath.replace("/api/actions/", ""));
        await deleteActionDb(orgId, id);
        return json(res, { ok: true });
      }
    }
    if (basePath === "/api/versions") {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      if (req.method === "GET") return json(res, await listVersionsDb(orgId));
      if (req.method === "POST") {
        const body = await readBody(req).catch(() => null);
        if (!body?.id || !body?.establishmentId || !body?.label) return json(res, { error: "Bad Request" }, 400);
        return json(res, await upsertVersionDb(orgId, body), 201);
      }
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

    // ── BACK-OFFICE (lecture seule) : tables de config brutes pour le
    // back-office interne (parcourir les référentiels, pas d'écriture).
    // Gardé par la vraie session Clerk (pas le jeton API_TOKEN_* partagé,
    // celui-là est déjà présent dans le bundle front envoyé à tout client) —
    // il faut être connecté ET que l'email corresponde à VITE_ADMIN_EMAIL. ──
    if (req.method === "GET" && basePath === "/api/admin/config") {
      const adminEmail = process.env.VITE_ADMIN_EMAIL;
      if (!adminEmail || !clerkEnabled) return json(res, { error: "Not configured" }, 404);
      const userId = await getClerkOrgId(req);
      if (!userId) return json(res, { error: "Unauthorized" }, 401);
      const clerkUser = await clerkClient.users.getUser(userId).catch(() => null);
      const email = clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
      if (!email || email !== adminEmail) return json(res, { error: "Forbidden" }, 403);
      try {
        const configDir = path.join(process.cwd(), "config");
        const stripBom = (raw: string) => raw.replace(/^﻿/, "").replace(/^ï»¿/, "");
        const readJsonDir = (rel: string) =>
          fs
            .readdirSync(path.join(configDir, rel))
            .filter((f) => f.endsWith(".json"))
            .map((f) => JSON.parse(stripBom(fs.readFileSync(path.join(configDir, rel, f), "utf-8"))));
        const readJsonFile = (rel: string) => JSON.parse(stripBom(fs.readFileSync(path.join(configDir, rel), "utf-8")));

        const risks = readJsonDir("risks");
        const naf = readJsonDir("naf");
        const actions = readJsonDir("actions").flat();
        const obligations = {
          general: readJsonFile("obligations/general.json"),
          sector: readJsonFile("obligations/sector.json"),
        };
        const scoring = readJsonFile("scoring.json");
        const unitsModifiers = readJsonFile("units/modifiers.json");

        return json(res, {
          risks,
          naf,
          actions,
          obligations,
          scoring,
          unitsModifiers,
          generatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[admin/config] failed", err);
        return json(res, { error: "Internal error" }, 500);
      }
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
    // Toutes ces routes exigent une vraie session Clerk : l'identité de
    // l'appelant (orgId) vient du jeton vérifié, jamais d'un champ envoyé
    // par le client (sinon n'importe qui peut lister/créer/révoquer les
    // invitations d'un autre utilisateur, ou faire envoyer un email arbitraire).
    if (req.method === "GET" && basePath === "/api/invites") {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      try {
        const rows = await query(
          "SELECT id, invitee_email, role, status, created_at FROM invitations WHERE owner_clerk_id = $1 ORDER BY created_at DESC",
          [orgId]
        ).catch(() => ({ rows: [] as any[] }));
        return json(res, { invites: rows.rows });
      } catch {
        return json(res, { invites: [] });
      }
    }

    if (req.method === "POST" && basePath === "/api/invites") {
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      const body = await readBody(req).catch(() => null);
      if (!body?.email) return json(res, { error: "Bad Request" }, 400);

      // Persist in DB
      try {
        await query(
          `INSERT INTO invitations (id, owner_clerk_id, invitee_email, role, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'pending', NOW())
           ON CONFLICT (owner_clerk_id, invitee_email) DO UPDATE SET status = 'pending', role = $3`,
          [orgId, body.email.toLowerCase(), body.role || "viewer"]
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
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      const body = await readBody(req).catch(() => null);
      if (!body?.email) return json(res, { error: "Bad Request" }, 400);
      await query(
        "DELETE FROM invitations WHERE owner_clerk_id = $1 AND invitee_email = $2",
        [orgId, body.email.toLowerCase()]
      ).catch(() => null);
      return json(res, { ok: true });
    }

    // ── RAPPEL RÉVISION ANNUELLE ─────────────────────────────────────────────
    // Le destinataire est toujours l'email du compte Clerk authentifié —
    // jamais une adresse fournie par le client, pour ne pas transformer
    // cette route en relais d'envoi d'emails arbitraires.
    if (req.method === "POST" && basePath === "/api/reminders/send") {
      if (!clerkEnabled) return json(res, { error: "Clerk not configured" }, 500);
      const orgId = await getClerkOrgId(req);
      if (!orgId) return json(res, { error: "Unauthorized" }, 401);
      const body = await readBody(req).catch(() => null);
      if (!body?.establishmentName) return json(res, { error: "Bad Request" }, 400);
      if (!RESEND_API_KEY) return json(res, { error: "Email service non configuré" }, 503);

      const requester = await clerkClient.users.getUser(orgId).catch(() => null);
      const to = requester?.emailAddresses?.[0]?.emailAddress;
      if (!to) return json(res, { error: "Email introuvable pour ce compte" }, 400);

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
            <p style="margin-top:24px;font-size:12px;color:#94a3b8">Kaijos</p>
          </div>
        </div>`;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [to],
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
