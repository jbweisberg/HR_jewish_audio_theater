import React, { FormEvent, useState } from 'react'
import { ExternalLink, Mail, Send } from 'lucide-react'

const CONTACT_EMAIL = 'Maggid@jewishaudiotheater.com'

type AuditionFields = {
  name: string
  age: string
  email: string
}

export default function AuditionForm() {
  const [fields, setFields] = useState<AuditionFields>({ name: '', age: '', email: '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ready' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const update = (key: keyof AuditionFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }))
    if (status !== 'idle') {
      setStatus('idle')
      setMessage('')
    }
  }

  const emailSubject = 'Jewish Audio Theater Audition'
  const emailBody = [
    'Jewish Audio Theater Audition Submission',
    '',
    `Name: ${fields.name}`,
    `Age of Participant: ${fields.age}`,
    `Email Address: ${fields.email}`,
    '',
    'I would like to be considered for an upcoming Jewish Audio Theater production.',
  ].join('\n')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')
    setMessage('')

    try {
      const response = await fetch('/api/audition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const result = await response.json() as { ready?: boolean; error?: string }
      if (!response.ok || !result.ready) throw new Error(result.error || 'Please check the form and try again.')
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Please check the form and try again.')
    }
  }

  return (
    <div className="audition-portal">
      <span className="audition-portal-kicker">Submission Portal</span>
      <h3>Step onto the stage.</h3>
      <p className="audition-portal-intro">Tell us who would like to audition. We’ll prepare the submission for The Maggid.</p>

      <form className="audition-form" onSubmit={submit}>
        <label>
          <span>Full Name</span>
          <input
            type="text"
            name="name"
            value={fields.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label>
          <span>Age of Participant</span>
          <input
            type="text"
            name="age"
            value={fields.age}
            onChange={(event) => update('age', event.target.value)}
            inputMode="numeric"
            required
          />
        </label>
        <label>
          <span>Email Address</span>
          <input
            type="email"
            name="email"
            value={fields.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <button className="audition-submit" type="submit" disabled={status === 'submitting'}>
          <Send size={17} /> {status === 'submitting' ? 'Preparing Audition…' : 'Submit Audition'}
        </button>
      </form>

      {status === 'error' && <div className="audition-form-status error" role="alert">{message}</div>}

      {status === 'ready' && (
        <div className="audition-ready" role="status">
          <span>Audition prepared</span>
          <strong>Send your submission to Jewish Audio Theater</strong>
          <div className="audition-ready-actions">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
            >
              <Mail size={16} /> Open Email App
            </a>
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> Open Gmail
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
