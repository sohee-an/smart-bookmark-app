import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { LoginLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingSkeleton />}>
      <LoginClient />
    </Suspense>
  );
}
