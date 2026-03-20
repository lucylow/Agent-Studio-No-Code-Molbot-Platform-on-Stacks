import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: 1247, suffix: "+", label: "Bots deployed" },
  { value: 52000, suffix: "+", label: "Transactions" },
  { value: 340, suffix: "", label: "Active builders" },
  { value: 99.9, suffix: "%", label: "Uptime" },
];

const AnimatedCounter = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  const formatted = target >= 1000 && Number.isInteger(target)
    ? count.toLocaleString()
    : target % 1 !== 0 ? count.toFixed(1) : count.toString();

  return <span ref={ref} className="tabular-nums">{formatted}{suffix}</span>;
};

const StatsSection = () => (
  <section className="relative py-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/20 rounded-2xl overflow-hidden border border-border/20">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-background p-8 text-center"
          >
            <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-xs text-muted-foreground/60">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
