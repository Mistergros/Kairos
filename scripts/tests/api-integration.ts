const API_BASE = process.env.API_BASE || process.env.VITE_DUERP_API_BASE || "http://localhost:8787";
const TOKEN =
  process.env.API_TOKEN_CONTRIB ||
  process.env.API_TOKEN_MANAGER ||
  process.env.API_TOKEN_ADMIN ||
  process.env.VITE_DUERP_API_TOKEN ||
  process.env.API_TOKEN ||
  "";
const TENANT = process.env.X_TENANT_ID || process.env.VITE_DUERP_TENANT_ID || "";
const HAS_AUTH = Boolean(TOKEN || process.env.API_JWT_SECRET);

async function callEvaluate(withAuth: boolean) {
  const url = `${API_BASE.replace(/\/$/, "")}/api/evaluate`;
  const ctx = { nafCode: "5610A", unity: "Cuisine", features: { solvents: true } };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(withAuth && TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(withAuth && !TOKEN && process.env.API_JWT_SECRET ? { Authorization: `Bearer dummy` } : {}),
      ...(TENANT ? { "X-Tenant-Id": TENANT } : {}),
    },
    body: JSON.stringify({ ctx }),
  });
  return res;
}

async function main() {
  // Expect success with auth (if configured)
  const resOk = await callEvaluate(true);
  if (!resOk.ok) {
    const txt = await resOk.text().catch(() => "");
    throw new Error(`Evaluate with auth failed (${resOk.status}) ${txt}`);
  }

  if (HAS_AUTH) {
    // Expect 401 without auth when tokens/JWT are configured
    const resNoAuth = await callEvaluate(false);
    if (resNoAuth.status !== 401) {
      throw new Error(`Expected 401 without auth, got ${resNoAuth.status}`);
    }
  }

  console.log("Integration test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
