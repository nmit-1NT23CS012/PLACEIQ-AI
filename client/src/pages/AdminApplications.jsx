import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader, SectionCard, StatusBadge } from '../components/UIComponents'
import { Loader, Search } from 'lucide-react'
import api from '../utils/api'

const formatDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString() : '—'
const formatStatus = status => status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Applied'

export default function AdminApplications() {
  const [applications, setApplications] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/applications')
      .then(response => setApplications(response.data.data || []))
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load applications.'))
      .finally(() => setLoading(false))
  }, [])

  const displayedApplications = useMemo(() => {
    const query = search.trim().toLowerCase()
    return applications.filter(application => {
      const matchesSearch = !query
        || application.studentName.toLowerCase().includes(query)
        || application.studentEmail.toLowerCase().includes(query)
        || application.jobTitle.toLowerCase().includes(query)
        || application.company.toLowerCase().includes(query)
      return matchesSearch && (!status || application.status === status)
    })
  }, [applications, search, status])

  return (
    <div className="space-y-4">
      <PageHeader title="Applications" subtitle="Monitor student applications across recruiter-posted jobs." />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search applications" placeholder="Search applicant, job, or company..." className="input-dark pl-9 text-xs" />
        </div>
        <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter applications by status" className="input-dark min-w-40 bg-dark-600 text-xs">
          <option value="">All statuses</option>
          {['applied', 'reviewing', 'shortlisted', 'rejected', 'offered'].map(item => <option key={item} value={item}>{formatStatus(item)}</option>)}
        </select>
      </div>

      <SectionCard title={`Applications (${displayedApplications.length})`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader className="h-6 w-6 animate-spin text-gold-400" /></div>
        ) : displayedApplications.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No applications match these filters.</p>
        ) : (
          <div className="space-y-3">
            {displayedApplications.map(application => (
              <article key={application.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/5 bg-dark-600 p-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">{application.studentName}</h2>
                  <p className="text-xs text-gray-400">{application.studentEmail || 'No email available'}</p>
                  <p className="mt-2 text-sm text-gold-400">{application.jobTitle} · {application.company}</p>
                  <p className="mt-1 text-xs text-gray-500">Applied {formatDate(application.appliedAt)} · Readiness {application.readinessScore}% · {application.hasResume ? 'Resume attached' : 'No resume attached'}</p>
                  {application.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{application.skills.slice(0, 8).map(skill => <span key={skill} className="badge badge-python">{skill}</span>)}</div>}
                </div>
                <StatusBadge status={formatStatus(application.status)} />
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
