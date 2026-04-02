import {
  Languages,
  Zap,
  Bot,
  TrendingUp,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: FeatureCard[] = [
  {
    icon: Languages,
    title: "Natural Language Processing",
    description:
      "Understand context, intent, and emotions with advanced NLP models that learn from every conversation.",
  },
  {
    icon: Zap,
    title: "Real-time Responses",
    description:
      "Instant, contextually relevant replies that keep conversations flowing naturally with sub-100ms latency.",
  },
  {
    icon: Bot,
    title: "Multi-bot Collaboration",
    description:
      "Orchestrate multiple specialized AI agents working together to solve complex user queries.",
  },
  {
    icon: TrendingUp,
    title: "Behavioral Analytics",
    description:
      "Gain insights into user behavior and conversation patterns to optimize your AI strategies.",
  },
  {
    icon: Plug,
    title: "Seamless Integrations",
    description:
      "Connect with your existing tools and platforms through our extensive API ecosystem.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "Military-grade encryption and compliance with global data protection regulations.",
  },
];

function getDelay(index: number): number {
  const column = index % 3;
  if (column === 0) return 100;
  if (column === 1) return 200;
  return 300;
}

export function Features() {
  return (
    <section id="features" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AnimateOnScroll className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Capabilities
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our AI chatbots are designed to handle complex conversations and
            deliver exceptional user experiences
          </p>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <AnimateOnScroll key={feature.title} delay={getDelay(index)}>
                <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-[5px] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3)]">
                  <div className="w-[60px] h-[60px] flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent mb-5">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
