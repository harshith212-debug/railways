import PageLoader from "@/components/PageLoader";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
      <PageLoader
        title="Loading Rail Yatra Dashboard"
        subtitle="Preparing IRCTC, UTS QR, NTES Live & R-Wallet..."
      />
    </div>
  );
}
