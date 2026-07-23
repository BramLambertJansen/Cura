import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Heart, Link2, UserRound, ListChecks, Timer, ShoppingCart, ChevronRight } from "lucide-react";
import { useSheets } from "../../sheetContext";
import { stagger, fadeUp } from "../../lib/motion";
import { Kop, PageHeader, IconBadge, Card } from "../../components/shared";

interface MeerItem {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}

interface MeerGroup {
  title: string;
  items: MeerItem[];
}

export function MeerPage() {
  const navigate = useNavigate();
  const { openHousehold, openProfiel } = useSheets();

  const groups: MeerGroup[] = [
    {
      title: "Samen",
      items: [
        { icon: <Heart size={16} />, label: "Samen", hint: "Wat is er vandaag gedaan", onClick: () => navigate("/samen", { state: { from: "meer" } }) },
      ],
    },
    {
      title: "Lijsten en focus",
      items: [
        { icon: <Timer size={16} />, label: "Focustimer", hint: "Even bij een ding blijven", onClick: () => navigate("/focus") },
        { icon: <ListChecks size={16} />, label: "Takenoverzicht", hint: "Verlopen, toekomst en zonder datum", onClick: () => navigate("/taken") },
        { icon: <ShoppingCart size={16} />, label: "Boodschappen", hint: "Wat moet er nog gehaald worden", onClick: () => navigate("/boodschappen") },
      ],
    },
    {
      title: "Instellingen",
      items: [
        { icon: <Link2 size={16} />, label: "Huishouden beheren", hint: "Naam, leden en uitnodigen", onClick: openHousehold },
        { icon: <UserRound size={16} />, label: "Account beheren", hint: "Naam, meldingen en uitloggen", onClick: openProfiel },
      ],
    },
  ];

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Meer" subtitle="Handige plekken bij elkaar." />
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-7">
        {groups.map((group) => (
          <motion.section key={group.title} variants={fadeUp}>
            <Kop>{group.title}</Kop>
            <div className="space-y-2.5">
              {group.items.map((item) => (
                <Card key={item.label} onClick={item.onClick} className="flex items-center gap-3.5 px-4 py-4" ariaLabel={item.label}>
                  <IconBadge icon={item.icon} size={36} />
                  <span className="flex-1 text-left">
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{item.hint}</span>
                  </span>
                  <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
                </Card>
              ))}
            </div>
          </motion.section>
        ))}
      </motion.div>
    </div>
  );
}
