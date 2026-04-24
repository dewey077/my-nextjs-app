export async function POST(req) {
  const body = await req.json();
  const { name } = body;

  return Response.json({
    message: `Hello ${name}, backend working!`
  });
}