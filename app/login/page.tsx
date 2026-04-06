import { normalizeNextPath } from "@/lib/supabase/navigation";
import { LoginForm } from "@/app/login/login-form";

interface LoginPageProps {
  searchParams?: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(params.next, "/");

  return <LoginForm nextPath={nextPath} />;
}
