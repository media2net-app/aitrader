import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - AI Trader by Chiel",
  description: "Sign in to your trading account",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
