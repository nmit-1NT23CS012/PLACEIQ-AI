import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader, SectionCard, StatusBadge } from '../components/UIComponents'
import { Loader, Search } from 'lucide-react'
import api from '../utils/api'

const formatDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : '—'

export default function AdminJobs() {
  const [jobs, setJobs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  const loadJobs = async () => {
    setError('')
    try {
      const response = await api.get('/admin/jobs')
      setJobs(response.data.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load job posts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadJobs() }, [])

  const displayedJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return jobs.filter(job => !query || job.title.toLowerCase().includes(query) || job.company.toLowerCase().includes(query))
  }, [jobs, search])

  const toggleStatus = async job => {
    setUpdatingId(job.id)
    setError('')
    try {
      const response = await api.patch(`/admin/jobs/${job.id}/status`, { status: job.status === 'open' ? 'closed' : 'open' })
      setJobs(current => current.map(item => item.id === job.id ? { ...item, ...response.data.data } : item))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this job.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Job Posts" subtitle="Review recruiter-posted jobs and close or reopen listings." />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search job posts" placeholder="Search title or company..." className="input-dark pl-9 text-xs" />
      </div>

      <SectionCard title={`Job Posts (${displayedJobs.length})`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader className="h-6 w-6 animate-spin text-gold-400" /></div>
        ) : displayedJobs.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No job posts match your search.</p>
        ) : (
          <div className="space-y-3">
            {displayedJobs.map(job => (
              <article key={job.id} className="rounded-xl border border-white/5 bg-dark-600 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-white">{job.title}</h2>
                    <p className="text-xs text-gray-400">{job.company} · Posted {formatDate(job.createdAt)}</p>
                    {job.requiredSkills.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{job.requiredSkills.map(skill => <span key={skill} className="badge badge-python">{skill}</span>)}</div>}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-gold-400">View job description</summary>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{job.description}</p>
                    </details>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status === 'open' ? 'Active' : 'Closed'} />
                    <button type="button" onClick={() => toggleStatus(job)} disabled={updatingId === job.id} className="btn-outline rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-50">
                      {updatingId === job.id ? 'Saving…' : job.status === 'open' ? 'Close job' : 'Reopen job'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
