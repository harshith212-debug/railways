import PageLoader from "@/components/PageLoader";

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
      <PageLoader
        title="Loading Sign In"
        subtitle="Connecting to Rail Yatra IRCTC Authentication..."
      />
    </div>
  );
}
