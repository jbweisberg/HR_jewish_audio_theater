type AuditionSubmission = {
  name?: string
  age?: string
  email?: string
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } })
    }

    let submission: AuditionSubmission
    try {
      submission = await request.json() as AuditionSubmission
    } catch {
      return Response.json({ error: 'Invalid submission' }, { status: 400 })
    }

    const name = submission.name?.trim()
    const age = submission.age?.trim()
    const email = submission.email?.trim()
    if (!name || !age || !email) {
      return Response.json({ error: 'Please complete all fields.' }, { status: 400 })
    }

    // No mail/storage provider is configured in this repository yet. Keep the
    // API explicit rather than pretending a submission was delivered.
    return Response.json({
      ready: true,
      name,
      age,
      email,
      message: 'Submission details validated. Choose an email delivery option to send them to the Maggid.'
    })
  },
}
