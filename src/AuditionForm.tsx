import React, { FormEvent, useState } from 'react'
import { Send } from 'lucide-react'

const FORM_ENDPOINT = 'https://formspree.io/f/mbdnndlg'

type AuditionFields = {
  name: string
  age: string
  email: string
}

export default function AuditionForm() {
  const [fields, setFields] = useState<AuditionFields>({ name: '', age: '', email: '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const update = (key: keyof AuditionFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }))
    if (status !== 'idle') {
      setStatus('idle')
      setMessage('')
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')
    setMessage('')

    const form = event.currentTarget
    const data = new FormData(form)

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        let errorMessage = 'We could not submit the audition. Please try again.'
        try {
          const result = await response.json() as { errors?: Array<{ message?: string }> }
          const formspreeMessage = result.errors?.map((item) => item.message).filter(Boolean).join(' ')
          if (formspreeMessage) errorMessage = formspreeMessage
        } catch {
          // Keep the clear fallback message if Formspree returns non-JSON.
        }
        throw new Error(errorMessage)
      }

      setFields({ name: '', age: '', email: '' })
      setStatus('success')
      setMessage('Your audition has been submitted to Jewish Audio Theater.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'We could not submit the audition. Please try again.')
    }
  }

  return (
    <div className="audition-portal">
      <span className="audition-portal-kicker">Submission Portal</span>
      <h3>Step onto the stage.</h3>
      <p className="audition-portal-intro">Tell us who would like to audition for an upcoming Jewish Audio Theater production.</p>

      <form className="audition-form" action={FORM_ENDPOINT} method="POST" onSubmit={submit}>
        <input type="hidden" name="_subject" value="New Jewish Audio Theater Audition" />

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
          <Send size={17} /> {status === 'submitting' ? 'Submitting Audition…' : 'Submit Audition'}
        </button>
      </form>

      {status === 'error' && <div className="audition-form-status error" role="alert">{message}</div>}
      {status === 'success' && (
        <div className="audition-form-status success" role="status">
          <strong>Audition submitted.</strong>
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}
