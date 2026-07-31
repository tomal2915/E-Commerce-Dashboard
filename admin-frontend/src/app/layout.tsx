// src/app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { ForbiddenListener } from "@/components/shared/ForbiddenListener";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
          <ForbiddenListener />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
