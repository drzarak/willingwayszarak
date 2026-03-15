export async function GET() {
  return Response.json({
    bookingConfigured: Boolean(
      process.env.NOTION_TOKEN?.trim() &&
        process.env.NOTION_BOOKING_PARENT_PAGE_ID?.trim(),
    ),
    realtimeConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    serverKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
