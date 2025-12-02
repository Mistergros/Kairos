import { BlueprintLayout } from "../../ui/layouts/BlueprintLayout";
import { DuerpDashboard } from "../../ui/dashboard/DuerpDashboard";

export function BlueprintDashboard() {
  return (
    <BlueprintLayout
      title="Blueprint DUERP"
      subtitle="Dashboard moteur coeur + recommandations sectorielles"
    >
      <DuerpDashboard />
    </BlueprintLayout>
  );
}
