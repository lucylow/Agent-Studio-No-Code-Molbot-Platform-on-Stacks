import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { mockMolbots } from "@/mocks/molbots";
import { SBTC_TO_USD, USDCX_TO_USD } from "@/types/molbot";
import type { Asset } from "@/types/molbot";

const top5 = [...mockMolbots].sort((a, b) => b.jobsCompleted - a.jobsCompleted).slice(0, 5);

const fiat = (amount: number, asset: Asset) =>
  asset === "sBTC" ? `$${(amount * SBTC_TO_USD).toFixed(2)}` : `$${(amount * USDCX_TO_USD).toFixed(2)}`;

const TrendingBotsStrip = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-primary/70 font-medium uppercase tracking-wider mb-1">Popular right now</p>
          <h2 className="text-xl font-semibold text-foreground">Trending Molbots</h2>
        </div>
        <Link to="/marketplace" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group">
          View all <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {top5.map((bot, i) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="snap-start"
          >
            <Link
              to={`/bots/${bot.id}`}
              className="block w-52 shrink-0 rounded-xl p-4 border border-border/30 bg-card/40 hover:bg-card/70 hover:border-border/50 transition-all duration-300 group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${bot.avatarColor}15` }}
                >
                  {bot.avatarEmoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{bot.name}</p>
                  <p className="text-[10px] text-muted-foreground/50 font-mono">{bot.ownerHandle}</p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground/70 line-clamp-2 mb-3 leading-relaxed">{bot.shortDescription}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-foreground font-medium">{bot.priceAmount} {bot.asset}</span>
                  <span className="text-[9px] text-muted-foreground/50">{fiat(bot.priceAmount, bot.asset)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Star className="w-2.5 h-2.5 text-amber-400/70" />
                  <span className="tabular-nums">{bot.rating.toFixed(1)}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrendingBotsStrip;
