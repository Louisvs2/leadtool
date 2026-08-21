import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-slide-up space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            C20
          </div>
          <h1 className="text-xl font-semibold tracking-tight">CultTwenty Outbound</h1>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </div>
  );
}
