import { Heading, Text } from "@/components/ui";
import { FreeSampleCapture } from "./FreeSampleCapture";
import { cn } from "@/lib/utils";

interface FreeSampleBannerProps {
  id?: string;
  className?: string;
}

export function FreeSampleBanner({ id, className }: FreeSampleBannerProps) {
  return (
    <section 
      id={id} 
      className={cn(
        "bg-secondary/5 border-b border-secondary/10 py-12 scroll-mt-24", 
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="flex flex-col lg:flex-row items-center justify-center gap-8 text-center lg:text-left">
            <div className="max-w-sm">
               <Heading className="mb-2">Try 3 free pages?</Heading>
               <Text>See the difference bold lines make. We’ll send them to your inbox.</Text>
            </div>
            <div className="w-full lg:w-auto lg:min-w-[520px]">
               <FreeSampleCapture />
            </div>
         </div>
      </div>
    </section>
  );
}
