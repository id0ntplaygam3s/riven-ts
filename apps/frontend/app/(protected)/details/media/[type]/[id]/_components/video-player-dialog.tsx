"use client";

import { Dialog, DialogContent, DialogClose } from "#components/_ui/dialog.tsx";
import { VideoPlayer } from "#components/media/video-player/video-player.tsx";
import { XIcon } from "lucide-react";

interface VideoPlayerDialogProps {
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayerDialog({ itemId, open, onOpenChange }: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden bg-black">
        <DialogClose className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 cursor-pointer">
          <XIcon className="w-6 h-6" />
        </DialogClose>
        <VideoPlayer itemId={itemId} className="aspect-video w-full" autoplay />
      </DialogContent>
    </Dialog>
  );
}
