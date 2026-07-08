import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Heart, Link2, UserRound, ListChecks, Timer, ShoppingCart, ChevronRight } from "lucide-react";
import { useSheets } from "../../sheetContext";
import { stagger, fadeUp } from "../../lib/motion";
import { PageHeader, IconBadge, Card } from "../../components/shared";

export function MeerPage() {
  const navigate = useNavigate();
  const { openHousehold, openProfiel } = useSheets();

  const items = [
    { icon: <Timer size={16} />, label: "Focustimer", hint: "Even bij één ding blijven", onClick: () => navigate("/focus") },
    { icon: <Heart size={16} />, label: "Samen", hint: "Wat is er vandaag gedaan", onClick: () => navigate("/samen") },
    { icon: <ListChecks size={16} />, label: "Takenoverzicht", hint: "Verlopen, toekomst en zonder datum", onClick: () => navigate("/taken") },
    { icon: <ShoppingCart size={16} />, label: "Boodschappen", hint: "Wat moet er nog gehaald worden", onClick: () => navigate("/boodschappen") },
    { icon: <Link2 size={16} />, label: "Huishouden beheren", hint: "Naam, leden en uitnodigen", onClick: openHousehold },
    { icon: <UserRound size={16} />, label: "Account beheren", hint: "Naam, meldingen en uitloggen", onClick: openProfiel },
  ];

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Meer" subtitle="Alles wat niet in de balk past." />
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
        {items.map((item) => (
          <motion.div key={item.label} variants={fadeUp}>
            <Card onClick={item.onClick} className="flex items-center gap-3.5 px-4 py-4" ariaLabel={item.label}>
              <IconBadge icon={item.icon} size={36} />
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{item.hint}</span>
              </span>
              <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
