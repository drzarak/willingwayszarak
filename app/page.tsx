import type { Metadata } from "next";

import { ChatApp } from "@/components/chat-app";

export const metadata: Metadata = {
  title: "Willing Ways AI Counselor",
  description:
    "Start a private Willing Ways AI call for relapse prevention, family support, post-rehab follow-through, and urgent next-step guidance.",
};

export default function Home() {
  return <ChatApp />;
}
