// app/layout.jsx (Server Component)
import Top_Header from "@/src/top_header";
import "./globals.css";

export default async function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-dvh">
        <Top_Header />
        {children}
      </body>
    </html>
  );
}
