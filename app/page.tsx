import DropZone from "@/components/DropZone";
import TranscriptEditor from "@/components/TranscriptEditor";
import PlaybackBar from "@/components/PlaybackBar";
import RestoreBanner from "@/components/RestoreBanner";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <RestoreBanner />
      <div className="flex-shrink-0">
        <DropZone />
      </div>
      <div className="flex-1 overflow-hidden">
        <TranscriptEditor />
      </div>
      <div className="flex-shrink-0">
        <PlaybackBar />
      </div>
    </div>
  );
}