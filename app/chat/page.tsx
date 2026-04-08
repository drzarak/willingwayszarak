import type { Metadata } from "next";

import { TextChatPage } from "@/components/text-chat-page";

export const metadata: Metadata = {
  title: "Dr Sadaqat GPT",
  description:
    "Text-first Willing Ways learning and counseling assistant for patients, families, staff, and classroom teaching.",
};

export default function ChatPage() {
  return <TextChatPage />;
}
