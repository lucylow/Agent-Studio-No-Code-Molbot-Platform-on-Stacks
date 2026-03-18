import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote: "Agent Studio made it possible to launch my first AI service on Bitcoin in minutes – no coding, no headaches.",
    author: "Alex Rivera",
    role: "Founder of BitBots",
    stars: 5,
  },
  {
    quote: "The x402 integration is seamless. My bots are earning sBTC while I sleep. This is the future.",
    author: "Maya Chen",
    role: "AI Researcher",
    stars: 5,
  },
  {
    quote: "Finally, a no-code platform that takes crypto payments seriously. USDCx streams are a game changer.",
    author: "Jordan Blake",
    role: "DeFi Builder",
    stars: 5,
  },
];

const TestimonialsSection = () => (
  <section className="relative py-24 section-divider">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Testimonials</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Early Adopters Love It
        </h2>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.author}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="gradient-border-card rounded-xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-0.5 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="w-3.5 h-3.5 text-primary fill-primary" />
              ))}
            </div>
            <Quote className="w-6 h-6 text-primary/20 mb-3" />
            <p className="text-foreground text-sm leading-relaxed mb-6 flex-1">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-primary">
                {t.author[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{t.author}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
