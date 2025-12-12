const API_BASE = process.env.API_BASE || process.env.VITE_DUERP_API_BASE || "http://localhost:8787";
const TOKEN =
  process.env.API_TOKEN_CONTRIB ||
  process.env.API_TOKEN_MANAGER ||
  process.env.API_TOKEN_ADMIN ||
  process.env.VITE_DUERP_API_TOKEN ||
  process.env.API_TOKEN ||
  "";
const TENANT = process.env.X_TENANT_ID || process.env.VITE_DUERP_TENANT_ID || "";

async function main() {
  const url = `${API_BASE.replace(/\/$/, "")}/api/evaluate`;
  const ctx = {
    nafCode: "5610A",
    unity: "Cuisine",
    features: { solvents: true, public_facing: true },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(TENANT ? { "X-Tenant-Id": TENANT } : {}),
    },
    body: JSON.stringify({ ctx }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  console.log("Smoke test OK. Risks:", data?.risks?.length || 0, "Actions:", data?.plan?.items?.length || 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
