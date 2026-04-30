export const maxDuration = 30;

export async function POST(_request: Request) {
  void _request;

  return new Response(
    JSON.stringify({
      error:
        "Text chat is disabled in this deployment because the current OpenAI key does not have the required text-generation scopes. Use the Willing Ways AI voice call instead.",
      voiceRoute: "/",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
