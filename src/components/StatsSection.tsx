import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Bot, Zap, ArrowUpRight, Shield } from "lucide-react";

const stats = [
  { value: 1247, suffix: "+", label: "Bots deployed", icon: Bot },
  { value: 52000, suffix: "+", label: "Transactions processed", icon: Zap },
  { value: 340, suffix: "", label: "Active builders", icon: ArrowUpRight },
  { value: 99.9, suffix: "%", label: "Uptime", icon: Shield },
];

const AnimatedCounter = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  const formatted = target >= 1000 && Number.isInteger(target)
    ? count.toLocaleString()
    : target % 1 !== 0
    ? count.toFixed(1)
    : count.toString();

  return (
    <span ref={ref} className="tabular-nums">
      {formatted}{suffix}
    </span>
  );
};

const StatsSection = () => (
  <section className="relative py-20 section-divider">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center p-6"
          >
            <stat.icon className="w-5 h-5 mx-auto mb-3 text-primary/60" />
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
