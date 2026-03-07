import { Player } from "@/components/player/Player";
import { F1StatsSidebar } from "@/components/f1/F1StatsSidebar";

export default function Home() {
  return (
    <div className="flex h-screen w-full min-h-0 flex-col md:flex-row">
      <div className="flex-[3] min-h-0 min-w-0 flex flex-col">
        <Player />
      </div>
      <div className="flex-[1] min-h-0 min-w-0 border-t border-[#333] bg-[#121212] md:border-l md:border-t-0 md:max-w-[320px]">
        <F1StatsSidebar />
      </div>
    </div>
  );
}
