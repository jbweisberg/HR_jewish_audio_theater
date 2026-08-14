const REPERTORY_CACHE_KEY = 'jat_repertory_v3'
const THEATER_CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

try {
  localStorage.removeItem(REPERTORY_CACHE_KEY)
} catch {
  // Storage can be unavailable in privacy modes; the app still works.
}

let theaterChime: HTMLAudioElement | null = null
let chimeArmed = false
let attachedAudio: HTMLAudioElement | null = null
let cuePlayedForLoad = false
let cueAttemptInFlight = false

const prepareTheaterChime = () => {
  if (theaterChime) return theaterChime

  const chime = new Audio(THEATER_CHIME_URL)
  chime.preload = 'auto'
  chime.loop = true
  chime.volume = 0
  chime.playsInline = true
  chime.load()
  theaterChime = chime
  return chime
}

// Start the chime media element while the listener is actively tapping/clicking.
// It then remains playing silently and already authorized. At the 1-minute mark
// we only reveal its volume and restart it from the beginning — no new autoplay
// permission is required at that later moment.
const armTheaterChime = async () => {
  const chime = prepareTheaterChime()

  try {
    chime.loop = true
    chime.volume = 0

    if (chime.paused) {
      await chime.play()
    }

    chimeArmed = !chime.paused
  } catch {
    chimeArmed = false
  }
}

const playTheaterChime = async (): Promise<boolean> => {
  if (cueAttemptInFlight) return false
  cueAttemptInFlight = true

  try {
    const chime = prepareTheaterChime()

    // If the silent armed playback is still alive, this is just a seek +
    // volume change on an already-playing media element.
    if (chimeArmed && !chime.paused) {
      chime.loop = false
      chime.currentTime = 0
      chime.volume = 0.52
      return true
    }

    // Recovery path for browsers that suspended the silent element. Because
    // the same element was previously user-activated, many browsers still
    // permit this restart; if not, we leave the cue unplayed and retry.
    chime.loop = false
    chime.currentTime = 0
    chime.volume = 0.52
    await chime.play()
    chimeArmed = true
    return true
  } catch {
    return false
  } finally {
    cueAttemptInFlight = false
  }
}

const resetChimeForStory = () => {
  cuePlayedForLoad = false
  cueAttemptInFlight = false

  const chime = prepareTheaterChime()
  chime.volume = 0
  chime.loop = true

  // If it is still playing from the prior authorization, keep it armed.
  chimeArmed = !chime.paused
}

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio || cuePlayedForLoad) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const remaining = duration - (audio.currentTime || 0)

  // Fire as the visual 1-minute state begins. Keep retrying for several
  // seconds, but only mark success after the chime element is actually playing.
  if (duration > 75 && remaining <= 60 && remaining > 52) {
    void playTheaterChime().then((started) => {
      if (started) cuePlayedForLoad = true
    })
  }
}

const attachAudio = (audio: HTMLAudioElement) => {
  if (attachedAudio === audio) return

  if (attachedAudio) {
    attachedAudio.removeEventListener('timeupdate', onTimeUpdate)
  }

  attachedAudio = audio
  resetChimeForStory()
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadstart', resetChimeForStory)
}

const revealImageWhenReady = (image: HTMLImageElement) => {
  const reveal = () => {
    image.style.opacity = '1'
  }

  if (!image.complete || image.naturalWidth === 0) {
    image.style.opacity = '0'
    image.style.transition = image.style.transition || 'opacity 140ms ease'
    image.addEventListener('load', reveal, { once: true })
    image.addEventListener('error', reveal, { once: true })
  } else {
    reveal()
  }
}

const processImages = (root: ParentNode = document) => {
  root.querySelectorAll('img').forEach((node) => {
    if (node instanceof HTMLImageElement) revealImageWhenReady(node)
  })
}

const findAndAttachAudio = () => {
  const audio = document.querySelector('audio')
  if (audio instanceof HTMLAudioElement) attachAudio(audio)
}

const gestureArm = () => {
  void armTheaterChime()
}

// Any intentional listener interaction can arm the theater cue, including the
// initial Begin Production / Listen Now tap and subsequent play/resume taps.
document.addEventListener('pointerdown', gestureArm, { passive: true })
document.addEventListener('touchstart', gestureArm, { passive: true })
document.addEventListener('click', gestureArm, { passive: true })
document.addEventListener('keydown', gestureArm)

const observer = new MutationObserver((mutations) => {
  findAndAttachAudio()

  for (const mutation of mutations) {
    if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
      revealImageWhenReady(mutation.target)
      continue
    }

    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLImageElement) {
        revealImageWhenReady(node)
      } else if (node instanceof Element) {
        processImages(node)
      }
    })
  }
})

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src'],
})

prepareTheaterChime()
findAndAttachAudio()
processImages()
