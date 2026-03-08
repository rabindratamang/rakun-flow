import { Player } from "@/components/player/Player";
import { getF1StreamsDecoded } from "@/lib/f1-streams";

export default function F1Page() {
  return (
    <div className="flex h-screen w-full min-h-0 flex-col">
      <Player predefinedStreams={getF1StreamsDecoded()} />
    </div>
  );
}
