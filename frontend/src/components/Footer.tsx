export function Footer() {
  return (
    <footer className="border-t border-moss/20 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-muted">
        <p>
          Powered by{' '}
          <a
            href="https://birdnet.cornell.edu"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-pine underline underline-offset-2"
          >
            BirdNET
          </a>{' '}
          — a pretrained bird-audio model by the K. Lisa Yang Center for
          Conservation Bioacoustics (Cornell Lab of Ornithology &amp; TU
          Chemnitz). Model weights: CC BY-NC-SA 4.0 · Analyzer code: MIT.
        </p>
        <p>
          BirdWalk is an independent open-source demo for
          non-commercial, educational use. It is not endorsed by DEV,
          MLH, or Cornell, and its predictions are possible matches —
          never certainty.
        </p>
      </div>
    </footer>
  )
}
