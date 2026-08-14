const REPERTORY_CACHE_KEY = 'jat_repertory_v3'
const FALLBACK_CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

// Always paint the current feed first. This avoids briefly showing artwork
// from a prior cached feed before the current repertory arrives.
try {
  localStorage.removeItem(REPERTORY_CACHE_KEY)
} catch {
  // Storage can be unavailable in privacy modes; the app still works.
}

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let cueContext: AudioContext | null = null
let cueKeepAlive: OscillatorNode | null = null
let cueFallback: HTMLAudioElement | null = null
let fallbackPrimed = false
let attachedAudio: HTMLAudioElement | null = null
let cuePlayedForLoad = false

const getAudioContextClass = () =>
  window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext

const ensureKeepAlive = (context: AudioContext) => {
  if (cueKeepAlive) return
  try {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    gain.gain.value = 0.000001
    oscillator.frequency.value = 20
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    cueKeepAlive = oscillator
  } catch {
    // Best effort only.
  }
}

const primeFallback = async () => {
  try {
    if (!cueFallback) {
      cueFallback = new Audio(FALLBACK_CHIME_URL)
      cueFallback.preload = 'auto'
    }
    if (fallbackPrimed) return

    cueFallback.volume = 0
    await cueFallback.play()
    cueFallback.pause()
    cueFallback.currentTime = 0
    fallbackPrimed = true
  } catch {
    // The Web Audio cue remains the primary path.
  }
}

const unlockCue = async () => {
  try {
    const AudioContextClass = getAudioContextClass()
    if (AudioContextClass) {
      if (!cueContext || cueContext.state === 'closed') {
        cueContext = new AudioContextClass()
      }

      if (cueContext.state === 'suspended') {
        await cueContext.resume()
      }

      if (cueContext.state === 'running') {
        ensureKeepAlive(cueContext)
      }
    }
  } catch {
    // The cue is optional and must never interfere with playback.
  }

  void primeFallback()
}

const soundWebAudioCue = (context: AudioContext) => {
  const gain = context.createGain()
  const first = context.createOscillator()
  const second = context.createOscillator()
  const now = context.currentTime

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85)

  first.type = 'sine'
  second.type = 'sine'
  first.frequency.setValueAtTime(659.25, now)
  second.frequency.setValueAtTime(987.77, now)

  first.connect(gain)
  second.connect(gain)
  gain.connect(context.destination)

  first.start(now)
  second.start(now + 0.11)
  first.stop(now + 0.58)
  second.stop(now + 0.85)
}

const playFallbackCue = async () => {
  try {
    if (!cueFallback) {
      cueFallback = new Audio(FALLBACK_CHIME_URL)
      cueFallback.preload = 'auto'
    }
    cueFallback.pause()
    cueFallback.currentTime = 0
    cueFallback.volume = 0.24
    await cueFallback.play()
  } catch {
    // Never interrupt the story if the browser refuses the cue.
  }
}

const playCue = async () => {
  try {
    const context = cueContext
    if (context) {
      if (context.state === 'suspended') {
        try { await context.resume() } catch { /* use media fallback below */ }
      }

      if (context.state === 'running') {
        soundWebAudioCue(context)
        return
      }
    }
  } catch {
    // Use the fallback below.
  }

  await playFallbackCue()
}

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio || cuePlayedForLoad) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const remaining = duration - (audio.currentTime || 0)

  if (duration > 75 && remaining <= 60 && remaining > 15) {
    cuePlayedForLoad = true
    void playCue()
  }
}

const attachAudio = (audio: HTMLAudioElement) => {
  if (attachedAudio === audio) return

  if (attachedAudio) {
    attachedAudio.removeEventListener('timeupdate', onTimeUpdate)
  }

  attachedAudio = audio
  cuePlayedForLoad = false
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadstart', () => {
    cuePlayedForLoad = false
  })
}

const revealImageWhenReady = (image: HTMLImageElement) => {
  const reveal = () => {
    image.style.opacity = '1'
  }

  // Hide the element while a new source is resolving so the browser cannot
  // briefly paint a previously decoded image in the same DOM node.
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

// Unlock sound while a real user gesture is in progress. Keeping this same
// context alive avoids creating a brand-new blocked context at the 60s mark.
const gestureUnlock = () => { void unlockCue() }
document.addEventListener('pointerdown', gestureUnlock, { passive: true })
document.addEventListener('touchstart', gestureUnlock, { passive: true })
document.addEventListener('click', gestureUnlock, { passive: true })
document.addEventListener('keydown', gestureUnlock)

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

findAndAttachAudio()
processImages()
