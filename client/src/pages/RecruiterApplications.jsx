import React, { useEffect, useState } from 'react'
import { PageHeader, SectionCard, StatusBadge } from '../components/UIComponents'
import { Download, Loader } from 'lucide-react'
import api from '../utils/api'

const statuses = ['applied', 'reviewing', 'shortlisted', 'rejected', 'offered']
const formatStatus = status => status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Applied'

export default function RecruiterApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [downloadingId, setDownloadingId] = useState('')
  const [error, setError] = useState('')

  const loadApplications = async () => {
    setError('')
    try {
      const response = await api.get('/recruiters/applications')
      setApplications(response.data.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load job applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const updateStatus = async (application, status) => {
    setUpdatingId(application.id)
    setError('')
    try {
      const response = await api.patch(`/recruiters/applications/${application.id}`, { status })
      setApplications(current => current.map(item => item.id === application.id ? { ...item, ...response.data.data } : item))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update application status.')
    } finally {
      setUpdatingId('')
    }
  }

  const downloadResume = async application => {
    setDownloadingId(application.id)
    setError('')
    try {
      const response = await api.get(`/recruiters/applications/${application.id}/resume`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = application.resumeFileName || 'resume'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not download the applicant resume.')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Job Applications" subtitle="Review applicants, download their submitted resumes, and update application status." />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <SectionCard title={`Applicants (${applications.length})`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader className="h-6 w-6 animate-spin text-gold-400" /></div>
        ) : applications.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">Applicants will appear here when students apply to your open jobs.</p>
        ) : (
          <div className="space-y-3">
            {applications.map(application => (
              <article key={application.id} className="rounded-xl border border-white/5 bg-dark-600 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-white">{application.studentName || 'Student'}</h2>
                    <p className="text-xs text-gray-400">{application.studentEmail}</p>
                    <p className="mt-2 text-sm text-gold-400">{application.jobTitle} · {application.company}</p>
                    <p className="mt-1 text-xs text-gray-500">Applied {new Date(application.appliedAt).toLocaleString()} · Readiness {application.readinessScore || 0}%</p>
                    {application.skills?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {application.skills.map(skill => <span key={skill} className="badge badge-python">{skill}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={formatStatus(application.status)} />
                    <select
                      aria-label={`Update status for ${application.studentName || 'applicant'}`}
                      value={application.status || 'applied'}
                      onChange={event => updateStatus(application, event.target.value)}
                      disabled={updatingId === application.id}
                      className="input-dark bg-dark-700 py-1.5 text-xs disabled:opacity-50"
                    >
                      {statuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => downloadResume(application)}
                      disabled={!application.hasResume || downloadingId === application.id}
                      className="btn-outline flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {downloadingId === application.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {downloadingId === application.id ? 'Downloading…' : 'Resume'}
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
