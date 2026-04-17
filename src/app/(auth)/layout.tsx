export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-lg sm:space-y-8 sm:p-8">
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
