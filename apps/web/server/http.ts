export function json(data: any, init: number = 200) {
  return new Response(JSON.stringify(data), {
    status: init,
    headers: { "Content-Type": "application/json" },
  });
}
