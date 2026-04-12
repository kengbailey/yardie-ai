import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Yardie
          </span>
          <span className="text-white">AI</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
