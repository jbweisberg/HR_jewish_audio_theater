const REPERTORY_CACHE_KEY = 'jat_repertory_v3'
const CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

try {
  localStorage.removeItem(REPERTORY_CACHE_KEY)
} catch {
  // Storage can be unavailable in privacy modes; the app still works.
}

let attachedAudio: HTMLAudioElement | null = null
let warnedForLoad = false

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio || warnedForLoad) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const current = audio.currentTime || 0
  const remaining = duration - current

  // Restore the original production behavior exactly: at one minute
  // remaining, create and play the theater chime directly from its MP3 URL.
  if (duration > 65 && remaining <= 60.5 && remaining >= 59.5) {
    warnedForLoad = true
    new Audio(CHIME_URL).play().catch(() => {
      // If the browser happens to reject this exact tick, allow a retry on
      // the next timeupdate inside the same one-minute window.
      warnedForLoad = false
    })
  }
}

const attachAudio = (audio: HTMLAudioElement) => {
  if (attachedAudio === audio) return

  if (attachedAudio) {
    attachedAudio.removeEventListener('timeupdate', onTimeUpdate)
  }

  attachedAudio = audio
  warnedForLoad = false
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadstart', () => {
    warnedForLoad = false
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
