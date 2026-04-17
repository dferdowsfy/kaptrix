export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Kaptrix
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI Product Diligence Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
