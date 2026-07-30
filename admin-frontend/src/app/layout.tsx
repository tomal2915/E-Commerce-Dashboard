// src/app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toast";
import { ForbiddenListener } from "@/components/shared/ForbiddenListener";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
