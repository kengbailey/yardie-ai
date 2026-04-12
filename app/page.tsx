import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Cta } from "@/components/cta";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Cta />
      </main>
    </>
  );
}
