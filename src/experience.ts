const REPERTORY_CACHE_KEY = 'jat_repertory_v3'
const FALLBACK_CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

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
let attachedAudio: HTMLAudioElement | null = null
let cuePlayedForLoad = false
let cueAttemptInFlight = false

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

const prepareFallback = () => {
  if (!cueFallback) {
    cueFallback = new Audio(FALLBACK_CHIME_URL)
    cueFallback.preload = 'auto'
    cueFallback.volume = 0.34
    cueFallback.load()
  }
}

const unlockCue = async () => {
  prepareFallback()

  try {
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return

    if (!cueContext || cueContext.state === 'closed') {
      cueContext = new AudioContextClass()
    }

    if (cueContext.state === 'suspended') {
      await cueContext.resume()
    }

    if (cueContext.state === 'running') {
      ensureKeepAlive(cueContext)
    }
  } catch {
    // The cue is optional and must never interfere with playback.
  }
}

const soundWebAudioCue = (context: AudioContext) => {
  const master = context.createGain()
  const first = context.createOscillator()
  const second = context.createOscillator()
  const now = context.currentTime

  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.11, now + 0.025)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.92)

  first.type = 'sine'
  second.type = 'sine'
  first.frequency.setValueAtTime(659.25, now)
  second.frequency.setValueAtTime(987.77, now)

  first.connect(master)
  second.connect(master)
  master.connect(context.destination)

  first.start(now)
  second.start(now + 0.12)
  first.stop(now + 0.62)
  second.stop(now + 0.92)
}

const playFallbackCue = async (): Promise<boolean> => {
  prepareFallback()
  const fallback = cueFallback
  if (!fallback) return false

  try {
    fallback.pause()
    fallback.currentTime = 0
    fallback.volume = 0.34
    await fallback.play()
    return true
  } catch {
    return false
  }
}

const playCue = async (): Promise<boolean> => {
  if (cueAttemptInFlight) return false
  cueAttemptInFlight = true

  try {
    const context = cueContext
    if (context) {
      if (context.state === 'suspended') {
        try { await context.resume() } catch { /* fall through */ }
      }

      if (context.state === 'running') {
        soundWebAudioCue(context)
        return true
      }
    }

    return await playFallbackCue()
  } catch {
    return false
  } finally {
    cueAttemptInFlight = false
  }
}

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio || cuePlayedForLoad) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const remaining = duration - (audio.currentTime || 0)

  // Keep trying throughout the first seconds of the final-minute window.
  // We only mark the cue as played after a sound path actually starts.
  if (duration > 75 && remaining <= 60 && remaining > 54) {
    void playCue().then((started) => {
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
  cuePlayedForLoad = false
  cueAttemptInFlight = false
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadstart', () => {
    cuePlayedForLoad = false
    cueAttemptInFlight = false
  })
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

prepareFallback()
findAndAttachAudio()
processImages()
