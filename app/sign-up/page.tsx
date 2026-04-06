import { SignUpForm } from "@/app/sign-up/sign-up-form";
import { normalizeNextPath } from "@/lib/supabase/navigation";

interface SignUpPageProps {
  searchParams?: Promise<{ next?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(params.next, "/");

  return <SignUpForm nextPath={nextPath} />;
}
