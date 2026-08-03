import { JuridischPage } from "./JuridischPage";
import { VOORWAARDEN } from "./juridischContent";

export function VoorwaardenPage() {
  return <JuridischPage doc={VOORWAARDEN} ander={{ label: "Lees ook de privacyverklaring", to: "/privacy" }} />;
}
