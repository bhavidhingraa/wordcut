import WaveSurfer from "wavesurfer.js";

export const wavesurferController = {
  wavesurferRef: null as WaveSurfer | null,

  get(): WaveSurfer | null {
    return this.wavesurferRef;
  },

  set(ws: WaveSurfer | null) {
    this.wavesurferRef = ws;
  },
};
