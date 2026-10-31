import { AnimatedNumber } from "@/components/data/animated-number";
import { Cascade, CascadeItem } from "@/components/motion/reveal";

// Chiffres tirés du cahier des charges (installation, couverture, délai), pas de vanité.
const STATS = [
  { value: 2, unit: "", label: "actions obligatoires, pas une de plus" },
  { value: 5, unit: "min", label: "pour tout installer, sans développeur" },
  { value: 91, unit: "%", label: "de vos clients reliés à leur provenance" },
  { value: 24, unit: "h", label: "avant vos premières recommandations" },
];

export function HeroStats() {
  return (
    <Cascade className="mx-auto grid max-w-6xl grid-cols-2 border-y border-line lg:grid-cols-4">
      {STATS.map((stat, index) => (
        <CascadeItem
          key={stat.label}
          className={
            "px-4 py-8 sm:px-8 sm:py-10 " +
            (index % 2 ? "border-l border-line " : "") +
            (index === 2 ? "border-t border-line lg:border-t-0 lg:border-l " : "") +
            (index === 3 ? "border-t border-line lg:border-t-0" : "")
          }
        >
          <p className="font-serif text-5xl leading-none font-semibold text-forest sm:text-6xl">
            <AnimatedNumber value={stat.value} />
            {stat.unit && <span className="ml-1 text-3xl sm:text-4xl">{stat.unit}</span>}
          </p>
          <p className="mt-3 max-w-[220px] text-[15px] text-slate">{stat.label}</p>
        </CascadeItem>
      ))}
    </Cascade>
  );
}
