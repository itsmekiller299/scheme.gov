export async function POST() {
  const cookie = "token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0";
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": cookie } });
}
export async function GET() { return POST(); }
