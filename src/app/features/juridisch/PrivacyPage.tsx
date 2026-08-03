import { JuridischPage } from "./JuridischPage";
import { PRIVACY } from "./juridischContent";

export function PrivacyPage() {
  return <JuridischPage doc={PRIVACY} ander={{ label: "Lees ook de voorwaarden", to: "/voorwaarden" }} />;
}
