const FALLBACK_TEXT =
  "Expliquer brièvement le contexte, repérer d'éventuelles incohérences textuelles, proposer 2 à 3 recommandations génériques.";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LLM timeout")), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function callOnce(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return FALLBACK_TEXT;

  const payload = {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Tu es un assistant DUERP. Tu ne modifies jamais les données métier. Tu renvoies des textes courts et clairs.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 320,
  };

  const res = await withTimeout(
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    }),
    10_000
  );

  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = (await res.json()) as any;
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : FALLBACK_TEXT;
}

export async function callLLM(prompt: string): Promise<string> {
  try {
    return await callOnce(prompt);
  } catch (err) {
    try {
      return await callOnce(prompt);
    } catch {
      return FALLBACK_TEXT;
    }
  }
}
