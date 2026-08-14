import React from 'react'
import { createRoot } from 'react-dom/client'
import { Sparkles } from 'lucide-react'
import AuditionForm from './AuditionForm'

let mounted = false

const mountAuditionPortal = () => {
  if (mounted) return true
  const section = document.getElementById('auditions')
  if (!section) return false

  mounted = true
  section.innerHTML = ''
  createRoot(section).render(
    <div className="audition-stage-grid">
      <div className="audition-stage-copy">
        <div className="audition-icon"><Sparkles /></div>
        <p className="eyebrow dark">Step Onto the Stage</p>
        <h2>Your voice could be part of the next story.</h2>
        <p>Jewish Audio Theater is seeking children and adults for roles in upcoming theatrical productions.</p>
      </div>
      <AuditionForm />
    </div>,
  )
  return true
}

if (!mountAuditionPortal()) {
  const observer = new MutationObserver(() => {
    if (mountAuditionPortal()) observer.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
