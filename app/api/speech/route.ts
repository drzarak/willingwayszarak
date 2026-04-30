export const maxDuration = 30;

export async function POST(_request: Request) {
  void _request;

  return new Response(
    "Read-aloud is disabled in this deployment because the current OpenAI key does not have the required audio request scopes.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
