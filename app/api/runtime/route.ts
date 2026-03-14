export async function GET() {
  return Response.json({
    realtimeConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    serverKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
