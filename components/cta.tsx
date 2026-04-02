import { EmailForm } from "@/components/email-form";

export function Cta() {
  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-3xl p-12 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Join the Waiting List
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Be the first to experience Yardie AI when we launch. Get early
              access and exclusive updates.
            </p>

            <div className="max-w-md mx-auto">
              <EmailForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
