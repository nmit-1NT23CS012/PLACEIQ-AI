import React, { useEffect, useState } from 'react'
import { PageHeader, SectionCard, StatusBadge } from '../components/UIComponents'
import { Briefcase, Loader, PlusCircle } from 'lucide-react'
import api from '../utils/api'

const emptyForm = { title: '', company: '', description: '', requiredSkills: '' }

export default function RecruiterJobs() {
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingJob, setUpdatingJob] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadJobs = async () => {
    setError('')
    try {
      const response = await api.get('/recruiters/jobs')
      setJobs(response.data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your job postings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const createJob = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/recruiters/jobs', {
        title: form.title,
        company: form.company,
        description: form.description,
        requiredSkills: form.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean)
      })
      setForm(emptyForm)
      setNotice('Job posted successfully.')
      await loadJobs()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not post this job.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (job) => {
    setUpdatingJob(job.id)
    setError('')
    setNotice('')
    try {
      await api.patch(`/recruiters/jobs/${job.id}`, { status: job.status === 'open' ? 'closed' : 'open' })
      await loadJobs()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this job.')
    } finally {
      setUpdatingJob('')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Post a Job" subtitle="Create and manage your job postings." />

      <SectionCard title="New Job Posting">
        <form onSubmit={createJob} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-gray-400">Job title
              <input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="input-dark mt-1 w-full" placeholder="e.g. Backend Engineer" />
            </label>
            <label className="text-xs text-gray-400">Company
              <input required value={form.company} onChange={event => setForm({ ...form, company: event.target.value })} className="input-dark mt-1 w-full" placeholder="Company name" />
            </label>
          </div>
          <label className="block text-xs text-gray-400">Job description
            <textarea required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="input-dark mt-1 w-full min-h-32" placeholder="Describe the responsibilities and qualifications." />
          </label>
          <label className="block text-xs text-gray-400">Required skills (comma separated)
            <input value={form.requiredSkills} onChange={event => setForm({ ...form, requiredSkills: event.target.value })} className="input-dark mt-1 w-full" placeholder="Python, SQL, React" />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}
          <button type="submit" disabled={saving} className="btn-gold px-4 py-2 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
            {saving ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title={`Your Job Postings (${jobs.length})`}>
        {loading ? (
          <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-gold-400" /></div>
        ) : jobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">You have not posted any jobs yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="flex flex-col gap-3 rounded-xl border border-white/5 bg-dark-600 p-3 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500/10"><Briefcase className="w-5 h-5 text-gold-400" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{job.title}</p>
                  <p className="text-xs text-gray-400">{job.company} · Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'recently'}</p>
                  {job.requiredSkills?.length > 0 && <p className="mt-1 text-xs text-gray-500">{job.requiredSkills.join(', ')}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status === 'open' ? 'Active' : 'Closed'} />
                  <button type="button" onClick={() => toggleStatus(job)} disabled={updatingJob === job.id} className="btn-outline rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-50">
                    {updatingJob === job.id ? 'Saving...' : job.status === 'open' ? 'Close job' : 'Reopen job'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
