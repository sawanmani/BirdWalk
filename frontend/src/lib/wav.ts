// Client-side audio normalisation for BirdWalk.
//
// Why this exists: browsers record as webm/opus (or mp4/aac on Safari),
// which the backend's decoder (libsndfile) cannot read — verified in the
// Phase 3/4 testing where even a stereo mp3 broke the raw analyzer.
// Rather than shipping ffmpeg or pretending the format works, we decode
// and re-encode to a clean mono 48 kHz PCM WAV right in the browser using
// the Web Audio API before uploading. No data leaves the machine; this
// runs locally like everything else.

const TARGET_SAMPLE_RATE = 48_000

/** Decode any browser-playable audio blob and return a 16-bit PCM WAV. */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const decodeCtx = new AudioContext()
  let buffer: AudioBuffer
  try {
    buffer = await decodeCtx.decodeAudioData(arrayBuffer)
  } finally {
    void decodeCtx.close()
  }

  // Render to mono at 48 kHz via OfflineAudioContext (also resamples).
  const frames = Math.ceil(buffer.duration * TARGET_SAMPLE_RATE)
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE)
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  const pcm = rendered.getChannelData(0)

  return pcm16WavBlob(pcm, TARGET_SAMPLE_RATE)
}

function pcm16WavBlob(pcm: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2
  const dataSize = pcm.length * bytesPerSample
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  str(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  str(36, 'data')
  view.setUint32(40, dataSize, true)

  const out = new Int16Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return new Blob([header, out.buffer], { type: 'audio/wav' })
}
