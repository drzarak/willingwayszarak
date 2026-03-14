export async function GET() {
  return Response.json({
    serverKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
