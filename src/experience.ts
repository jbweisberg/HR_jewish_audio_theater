const REPERTORY_CACHE_KEY = 'jat_repertory_v3'

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
let attachedAudio: HTMLAudioElement | null = null
let cuePlayedForLoad = false

const getAudioContextClass = () =>
  window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext

const unlockCue = async () => {
  try {
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return

    if (!cueContext || cueContext.state === 'closed') {
      cueContext = new AudioContextClass()
    }

    if (cueContext.state === 'suspended') {
      await cueContext.resume()
    }
  } catch {
    // The cue is optional and must never interfere with playback.
  }
}

const playCue = () => {
  try {
    const context = cueContext
    if (!context || context.state !== 'running') return

    const gain = context.createGain()
    const first = context.createOscillator()
    const second = context.createOscillator()
    const now = context.currentTime

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.026, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72)

    first.type = 'sine'
    second.type = 'sine'
    first.frequency.setValueAtTime(659.25, now)
    second.frequency.setValueAtTime(987.77, now)

    first.connect(gain)
    second.connect(gain)
    gain.connect(context.destination)

    first.start(now)
    second.start(now + 0.1)
    first.stop(now + 0.48)
    second.stop(now + 0.72)
  } catch {
    // Never interrupt the story if the browser refuses a cue.
  }
}

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio || cuePlayedForLoad) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const remaining = duration - (audio.currentTime || 0)

  if (duration > 75 && remaining <= 60 && remaining > 15) {
    cuePlayedForLoad = true
    playCue()
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

const findAndAttachAudio = () => {
  const audio = document.querySelector('audio')
  if (audio instanceof HTMLAudioElement) attachAudio(audio)
}

// Unlock Web Audio while a real user gesture is in progress. The context can
// then be used later at the 60-second mark without autoplay-policy blocking.
document.addEventListener('pointerdown', () => void unlockCue(), { passive: true })
document.addEventListener('keydown', () => void unlockCue())

const observer = new MutationObserver(findAndAttachAudio)
observer.observe(document.documentElement, { childList: true, subtree: true })
findAndAttachAudio()
