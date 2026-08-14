const REPERTORY_CACHE_KEY = 'jat_repertory_v3'
const CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

try {
  localStorage.removeItem(REPERTORY_CACHE_KEY)
} catch {
  // Storage can be unavailable in privacy modes; the app still works.
}

let attachedAudio: HTMLAudioElement | null = null
let warnedForLoad = false
let armedChime: HTMLAudioElement | null = null
let chimeArmed = false

const getArmedChime = () => {
  if (armedChime) return armedChime

  const chime = new Audio(CHIME_URL)
  chime.preload = 'auto'
  chime.loop = true
  chime.volume = 0.001
  chime.playsInline = true
  chime.load()
  armedChime = chime
  return chime
}

const stopArmedChime = () => {
  const chime = armedChime
  if (!chime) return

  try {
    chime.pause()
    chime.loop = true
    chime.volume = 0.001
    chime.currentTime = 0
  } catch {
    // Page lifecycle cleanup must never block navigation or restore.
  }

  chimeArmed = false
}

const armChimeFromUserGesture = () => {
  const chime = getArmedChime()
  chime.loop = true
  chime.volume = 0.001

  if (!chime.paused) {
    chimeArmed = true
    return
  }

  void chime.play().then(() => {
    chimeArmed = true
  }).catch(() => {
    chimeArmed = false
  })
}

const soundTheaterChime = () => {
  const chime = getArmedChime()

  if (chimeArmed && !chime.paused) {
    try {
      chime.loop = false
      chime.currentTime = 0
      chime.volume = 0.9
      return true
    } catch {
      // Fall through to direct playback.
    }
  }

  const direct = new Audio(CHIME_URL)
  direct.volume = 0.9
  void direct.play().catch(() => {})
  return !direct.paused
}

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio || warnedForLoad) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const current = audio.currentTime || 0
  const remaining = duration - current

  if (duration > 65 && remaining <= 60.5 && remaining >= 59.0) {
    if (soundTheaterChime()) warnedForLoad = true
  }
}

const resetCueForStory = () => {
  warnedForLoad = false

  const chime = getArmedChime()
  if (!chime.paused) {
    chime.loop = true
    chime.volume = 0.001
    chimeArmed = true
  }
}

const attachAudio = (audio: HTMLAudioElement) => {
  if (attachedAudio === audio) return

  if (attachedAudio) {
    attachedAudio.removeEventListener('timeupdate', onTimeUpdate)
  }

  attachedAudio = audio
  resetCueForStory()
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadstart', resetCueForStory)
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

document.addEventListener('pointerdown', armChimeFromUserGesture, { passive: true })
document.addEventListener('touchstart', armChimeFromUserGesture, { passive: true })
document.addEventListener('click', armChimeFromUserGesture, { passive: true })
document.addEventListener('keydown', armChimeFromUserGesture)

// Chrome can restore a recently closed tab from its page cache. Never carry
// the continuously armed hidden chime through that lifecycle boundary.
window.addEventListener('pagehide', stopArmedChime)
window.addEventListener('beforeunload', stopArmedChime)

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    stopArmedChime()
  }
})

window.addEventListener('pageshow', () => {
  warnedForLoad = false
  chimeArmed = false
  findAndAttachAudio()
  processImages()
})

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

getArmedChime()
findAndAttachAudio()
processImages()
