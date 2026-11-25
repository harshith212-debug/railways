import PageLoader from "@/components/PageLoader";

export default function SignupLoading() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
      <PageLoader
        title="Loading Registration"
        subtitle="Setting up your Rail Yatra & R-Wallet onboarding..."
      />
    </div>
  );
}
