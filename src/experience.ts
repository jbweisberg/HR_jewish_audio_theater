const CHIME_URL = '/api/chime'
const CONTACT_EMAIL = 'Maggid@jewishaudiotheater.com'
const RESUME_KEY = 'jat_resume_v1'

type ResumeState = {
  title: string
  currentTime: number
  duration: number
  savedAt: number
}

let attachedAudio: HTMLAudioElement | null = null
let warnedForLoad = false
let armedChime: HTMLAudioElement | null = null
let chimeArmed = false
let contactOverlay: HTMLDivElement | null = null
let resumeCard: HTMLButtonElement | null = null
let lastSavedSecond = -1

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

const formatClock = (value: number) => {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

const getActiveTitle = () => {
  const playerTitle = document.querySelector('.player-title-wrap strong')
  return playerTitle?.textContent?.trim() || ''
}

const clearResume = () => {
  try { localStorage.removeItem(RESUME_KEY) } catch { /* best effort */ }
  resumeCard?.remove()
  resumeCard = null
}

const saveResume = () => {
  const audio = attachedAudio
  if (!audio) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const currentTime = audio.currentTime || 0
  const title = getActiveTitle()

  if (!title || currentTime < 20) return
  if (duration > 0 && duration - currentTime < 30) {
    clearResume()
    return
  }

  const wholeSecond = Math.floor(currentTime)
  if (wholeSecond === lastSavedSecond) return
  lastSavedSecond = wholeSecond

  const state: ResumeState = { title, currentTime, duration, savedAt: Date.now() }
  try { localStorage.setItem(RESUME_KEY, JSON.stringify(state)) } catch { /* best effort */ }
}

const readResume = (): ResumeState | null => {
  try {
    const raw = localStorage.getItem(RESUME_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ResumeState
    if (!parsed.title || parsed.currentTime < 30) return null
    if (parsed.duration > 0 && parsed.duration - parsed.currentTime < 60) return null
    return parsed
  } catch {
    return null
  }
}

const clickStoryByTitle = (title: string, resumeAt = 0) => {
  const normalized = title.trim().toLowerCase()

  const heroTitle = document.querySelector('#featured-title')?.textContent?.trim().toLowerCase()
  if (heroTitle === normalized) {
    const heroButton = document.querySelector<HTMLButtonElement>('.hero-play')
    if (heroButton) {
      heroButton.click()
      if (resumeAt > 0) scheduleResumeSeek(resumeAt)
      return true
    }
  }

  const cards = Array.from(document.querySelectorAll<HTMLElement>('.production-card'))
  const card = cards.find((node) => node.querySelector('h3')?.textContent?.trim().toLowerCase() === normalized)
  const playButton = card?.querySelector<HTMLButtonElement>('.production-card-copy button, .production-art-button')
  if (playButton) {
    playButton.click()
    if (resumeAt > 0) scheduleResumeSeek(resumeAt)
    return true
  }

  return false
}

const scheduleResumeSeek = (seconds: number) => {
  const apply = () => {
    const audio = document.querySelector('audio')
    if (!(audio instanceof HTMLAudioElement)) return

    const seek = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      const target = duration > 0 ? Math.min(seconds, Math.max(0, duration - 1)) : seconds
      try {
        audio.currentTime = target
        void audio.play().catch(() => {})
      } catch {
        // A later metadata event may still be needed.
      }
    }

    if (audio.readyState >= 1) seek()
    else audio.addEventListener('loadedmetadata', seek, { once: true })
  }

  window.setTimeout(apply, 80)
}

const renderResumeCard = () => {
  if (resumeCard || !document.querySelector('.entrance-content')) return
  const state = readResume()
  if (!state) return

  const host = document.querySelector('.entrance-content')
  if (!host) return

  const button = document.createElement('button')
  button.type = 'button'
  button.style.cssText = [
    'width:min(540px,88vw)',
    'margin:24px auto 2px',
    'padding:16px 18px',
    'display:grid',
    'gap:5px',
    'background:rgba(9,6,7,.72)',
    'border:1px solid rgba(212,175,55,.38)',
    'color:#f5f2e8',
    'text-align:left',
    'cursor:pointer',
    'box-shadow:0 18px 55px rgba(0,0,0,.34)',
    'backdrop-filter:blur(8px)'
  ].join(';')
  button.innerHTML = `
    <span style="font-size:9px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#d4af37">The curtain is waiting</span>
    <strong style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;line-height:1.05;font-style:italic">Continue ${state.title}</strong>
    <small style="font-size:11px;color:rgba(245,242,232,.68)">Resume at ${formatClock(state.currentTime)} · Tap to continue</small>
  `

  button.addEventListener('click', () => {
    armChimeFromUserGesture()
    const enter = document.querySelector<HTMLButtonElement>('.entrance-button')
    enter?.click()
    window.setTimeout(() => {
      if (!clickStoryByTitle(state.title, state.currentTime)) clearResume()
    }, 120)
  })

  const footnote = host.querySelector('.entrance-footnote')
  if (footnote) host.insertBefore(button, footnote)
  else host.appendChild(button)
  resumeCard = button
}

const onTimeUpdate = () => {
  const audio = attachedAudio
  if (!audio) return

  const duration = Number.isFinite(audio.duration) ? audio.duration : 0
  const current = audio.currentTime || 0
  const remaining = duration - current

  if (Math.floor(current) % 5 === 0) saveResume()

  if (!warnedForLoad && duration > 65 && remaining <= 60.5 && remaining >= 59.0) {
    if (soundTheaterChime()) warnedForLoad = true
  }
}

const resetCueForStory = () => {
  warnedForLoad = false
  lastSavedSecond = -1

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
    attachedAudio.removeEventListener('ended', clearResume)
  }

  attachedAudio = audio
  resetCueForStory()
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadstart', resetCueForStory)
  audio.addEventListener('ended', clearResume)
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

const openContactPanel = (subject = 'Jewish Audio Theater') => {
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
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
  })
  panel.querySelector<HTMLButtonElement>('[data-contact-gmail]')?.addEventListener('click', () => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(subject)}`,
      '_blank',
      'noopener,noreferrer'
    )
  })
}

const handleImmediateStoryChoice = (event: Event) => {
  const target = event.target instanceof Element ? event.target : null
  const choice = target?.closest('.bedtime-choice') as HTMLButtonElement | null
  if (!choice) return

  const title = choice.querySelector('strong')?.textContent?.trim()
  if (!title) return

  event.preventDefault()
  event.stopPropagation()
  if ('stopImmediatePropagation' in event) event.stopImmediatePropagation()
  armChimeFromUserGesture()
  window.setTimeout(() => { void clickStoryByTitle(title) }, 0)
}

document.addEventListener('pointerdown', armChimeFromUserGesture, { passive: true })
document.addEventListener('touchstart', armChimeFromUserGesture, { passive: true })
document.addEventListener('click', armChimeFromUserGesture, { passive: true })
document.addEventListener('keydown', armChimeFromUserGesture)

document.addEventListener('click', handleImmediateStoryChoice, true)

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
  const subject = href.toLowerCase().includes('audition') ? 'Jewish Audio Theater Audition' : 'Jewish Audio Theater'
  openContactPanel(subject)
}, true)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && contactOverlay) closeContactPanel()
})

window.addEventListener('pagehide', () => {
  saveResume()
  stopArmedChime()
  closeContactPanel()
})
window.addEventListener('beforeunload', () => {
  saveResume()
  stopArmedChime()
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveResume()
    stopArmedChime()
  }
})

window.addEventListener('pageshow', () => {
  warnedForLoad = false
  chimeArmed = false
  findAndAttachAudio()
  processImages()
  renderResumeCard()
})

const observer = new MutationObserver((mutations) => {
  findAndAttachAudio()
  renderResumeCard()

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
renderResumeCard()
