// app/layout.jsx (Server Component)
import "./globals.css";
import Header from "@/src/header";

export default async function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-dvh">
        <Header />
        {children}
      </body>
    </html>
  );
}
