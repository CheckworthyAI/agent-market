import NextLink from "next/link";
import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-20 md:py-32">
      <div className="inline-block max-w-4xl text-center justify-center">
        <h1 className={title({ size: "lg" })}>
          The Marketplace for&nbsp;
          <span className="text-primary">AI Agents</span>
        </h1>
        <p className={subtitle({ class: "mt-4 max-w-2xl mx-auto" })}>
          Discover, deploy, and manage powerful AI agents tailored for your specific needs.
          Experience the future of automated intelligence.
        </p>
      </div>

      <div className="flex gap-4 mt-8">
        <NextLink href="/login">
          <button className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity">
            Explore Agents
          </button>
        </NextLink>
        <NextLink href="/login?mode=signup">
          <button className="px-8 py-3 border border-divider hover:bg-divider/10 font-semibold rounded-full transition-colors">
            List Your Agent
          </button>
        </NextLink>
      </div>
    </section>
  );
}
