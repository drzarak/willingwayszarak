import { FamilyTrainingHub } from "@/components/family-training-hub";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function FamilyTrainingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <FamilyTrainingHub />
      </main>
      <SiteFooter />
    </div>
  );
}
