import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { mockMolbots } from "@/mocks/molbots";
import { SBTC_TO_USD, USDCX_TO_USD } from "@/types/molbot";

const top5 = [...mockMolbots].sort((a, b) => b.jobsCompleted - a.jobsCompleted).slice(0, 5);

const TrendingBotsStrip = () => (
  <section className="py-12 section-divider">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Trending Molbots</h2>
        <Link to="/marketplace" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {top5.map((bot, i) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <Link
              to={`/bots/${bot.id}`}
              className="block w-56 shrink-0 gradient-border-card rounded-xl p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${bot.avatarColor}20` }}
                >
                  {bot.avatarEmoji}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{bot.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono">{bot.ownerHandle}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {bot.shortDescription}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-primary font-semibold">
                  {bot.priceAmount} {bot.asset}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  bot.x402Enabled
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}>
                  {bot.x402Enabled ? "x402" : "USDCx"}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrendingBotsStrip;
