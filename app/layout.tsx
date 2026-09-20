import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

// Inter carries all structural/UI text (body, label, display-number).
// See ARCHITECTURE-SPINE.md / DESIGN.md Typography.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Lora (italic) is reserved exclusively for the Recommendation role —
// the single serif moment in the product. Never used for headings/body.
const lora = Lora({
  variable: "--font-recommendation",
  subsets: ["latin"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Calorie Tracker",
  description: "A calm, private daily calorie tracker.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
