const REPERTORY_CACHE_KEY = 'jat_repertory_v3'
const CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
const CONTACT_EMAIL = 'Maggid@jewishaudiotheater.com'

try {
  localStorage.removeItem(REPERTORY_CACHE_KEY)
} catch {
  // Storage can be unavailable in privacy modes; the app still works.
}

let attachedAudio: HTMLAudioElement | null = null
let warnedForLoad = false
let armedChime: HTMLAudioElement | null = null
let chimeArmed = false
let contactOverlay: HTMLDivElement | null = null

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

const copyContactEmail = async (button: HTMLButtonElement) => {
  try {
    await navigator.clipboard.writeText(CONTACT_EMAIL)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = CONTACT_EMAIL
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  const original = button.textContent
  button.textContent = 'Email Copied'
  window.setTimeout(() => {
    button.textContent = original
  }, 1800)
}

const closeContactPanel = () => {
  contactOverlay?.remove()
  contactOverlay = null
}

const openContactPanel = () => {
  if (contactOverlay) return

  const overlay = document.createElement('div')
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Contact Jewish Audio Theater')
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:12000',
    'display:grid',
    'place-items:center',
    'padding:24px',
    'background:rgba(3,3,4,.82)',
    'backdrop-filter:blur(10px)'
  ].join(';')

  const panel = document.createElement('div')
  panel.style.cssText = [
    'position:relative',
    'width:min(560px,100%)',
    'padding:34px',
    'background:#0d0a0b',
    'color:#f1eadf',
    'border:1px solid rgba(201,164,81,.35)',
    'box-shadow:0 30px 100px rgba(0,0,0,.6)',
    'text-align:center'
  ].join(';')

  panel.innerHTML = `
    <button type="button" data-contact-close aria-label="Close contact" style="position:absolute;top:12px;right:14px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.05);color:#c9a451;cursor:pointer;font-size:22px;line-height:1">×</button>
    <div style="font-size:11px;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:#c9a451;margin-bottom:12px">Contact the Maggid</div>
    <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:40px;font-style:italic;font-weight:700;line-height:1;margin-bottom:12px">Heshy Riesel</div>
    <div style="font-size:15px;color:#d6cec0;word-break:break-word;margin-bottom:26px">${CONTACT_EMAIL}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <button type="button" data-contact-copy style="padding:14px 12px;background:#c9a451;color:#070708;font-weight:900;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">Copy Email</button>
      <button type="button" data-contact-mail style="padding:14px 12px;background:#4c0d13;color:#f1eadf;border:1px solid rgba(201,164,81,.3);font-weight:900;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">Open Email App</button>
    </div>
    <button type="button" data-contact-gmail style="width:100%;padding:13px 12px;background:transparent;color:#c9a451;border:1px solid rgba(201,164,81,.24);font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">Open Gmail in Browser</button>
  `

  overlay.appendChild(panel)
  document.body.appendChild(overlay)
  contactOverlay = overlay

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeContactPanel()
  })

  panel.querySelector<HTMLButtonElement>('[data-contact-close]')?.addEventListener('click', closeContactPanel)
  panel.querySelector<HTMLButtonElement>('[data-contact-copy]')?.addEventListener('click', (event) => {
    void copyContactEmail(event.currentTarget)
  })
  panel.querySelector<HTMLButtonElement>('[data-contact-mail]')?.addEventListener('click', () => {
    window.location.href = `mailto:${CONTACT_EMAIL}`
  })
  panel.querySelector<HTMLButtonElement>('[data-contact-gmail]')?.addEventListener('click', () => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`,
      '_blank',
      'noopener,noreferrer'
    )
  })
}

document.addEventListener('pointerdown', armChimeFromUserGesture, { passive: true })
document.addEventListener('touchstart', armChimeFromUserGesture, { passive: true })
document.addEventListener('click', armChimeFromUserGesture, { passive: true })
document.addEventListener('keydown', armChimeFromUserGesture)

// Intercept every JAT contact mailto so clicking Contact always produces a
// visible in-browser action, even when Chrome has no default email handler.
document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null
  const link = target?.closest('a[href^="mailto:"]') as HTMLAnchorElement | null
  if (!link) return

  const href = link.getAttribute('href') || ''
  if (!href.toLowerCase().includes(CONTACT_EMAIL.toLowerCase())) return

  event.preventDefault()
  event.stopPropagation()
  openContactPanel()
}, true)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && contactOverlay) closeContactPanel()
})

// Chrome can restore a recently closed tab from its page cache. Never carry
// the continuously armed hidden chime through that lifecycle boundary.
window.addEventListener('pagehide', () => {
  stopArmedChime()
  closeContactPanel()
})
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
