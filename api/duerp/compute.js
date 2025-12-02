import { DuerpService } from "../../src/core/services/duerp-service";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { nafCode = "47", unity = "Magasin", features = {} } = req.body || {};
    const service = new DuerpService();
    const risks = service.getRisks({ nafCode, unity, features });
    const evaluations = service.evaluate({ nafCode, unity, features });
    const plan = service.plan(evaluations);
    const obligations = service.obligations({ nafCode, unity, features });

    return res.status(200).json({ risks, evaluations, plan, obligations });
  } catch (error) {
    console.error("DUERP compute error", error);
    return res.status(500).json({ error: "Internal error" });
  }
}
