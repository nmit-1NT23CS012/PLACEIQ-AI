import React, { useEffect, useState } from 'react'
import { PageHeader, SectionCard, StatusBadge } from '../components/UIComponents'
import { Briefcase, Loader, Upload, X } from 'lucide-react'
import api from '../utils/api'

const formatStatus = status => status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Applied'

export default function StudentJobs() {
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [expandedJob, setExpandedJob] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    const loadJobs = async () => {
      try {
        const [jobsResponse, applicationsResponse] = await Promise.all([
          api.get('/jobs'),
          api.get('/jobs/applications')
        ])

        if (active) {
          setJobs(jobsResponse.data.data || [])
          setApplications(applicationsResponse.data.data || [])
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Could not load available jobs.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadJobs()
    return () => { active = false }
  }, [])

  const apply = async event => {
    event.preventDefault()
    if (!selectedJob || !resumeFile || !consent) return

    setApplying(true)
    setError('')
    setNotice('')
    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      const response = await api.post(`/jobs/${selectedJob.id}/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setApplications(current => [response.data.data, ...current])
      setNotice(`Your application for ${selectedJob.title} was submitted.`)
      setSelectedJob(null)
      setResumeFile(null)
      setConsent(false)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit your application.')
    } finally {
      setApplying(false)
    }
  }

  const applicationsByJob = new Map(applications.map(application => [application.jobId, application]))

  return (
    <div className="space-y-4">
      <PageHeader title="Open Jobs" subtitle="Explore recruiter-posted jobs and choose a resume for each application." />

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}

      <SectionCard title={`Available Jobs (${jobs.length})`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader className="h-6 w-6 animate-spin text-gold-400" /></div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Briefcase className="h-8 w-8 text-gray-600" />
            <p className="text-sm text-gray-400">There are no open recruiter-posted jobs right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const application = applicationsByJob.get(job.id)
              return (
                <article key={job.id} className="rounded-xl border border-white/5 bg-dark-600 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-white">{job.title}</h2>
                      <p className="mt-0.5 text-sm text-gray-400">{job.company}</p>
                      <p className="mt-2 text-sm text-gray-300 whitespace-pre-wrap">
                        {expandedJob === job.id ? job.description : `${job.description.slice(0, 240)}${job.description.length > 240 ? '…' : ''}`}
                      </p>
                      {job.description.length > 240 && (
                        <button type="button" onClick={() => setExpandedJob(expandedJob === job.id ? '' : job.id)} className="mt-1 text-xs text-gold-400 hover:text-gold-300">
                          {expandedJob === job.id ? 'Show less' : 'Read full description'}
                        </button>
                      )}
                      {job.requiredSkills?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {job.requiredSkills.map(skill => <span key={skill} className="badge badge-python">{skill}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-start gap-2">
                      {application ? (
                        <StatusBadge status={formatStatus(application.status)} />
                      ) : (
                        <button type="button" onClick={() => { setError(''); setSelectedJob(job); setResumeFile(null); setConsent(false) }} className="btn-gold rounded-lg px-4 py-2 text-xs">
                          Apply with Resume
                        </button>
                      )}
                      <span className="text-xs text-gray-500">{application ? 'Application submitted' : `Posted ${job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'recently'}`}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title={`My Applications (${applications.length})`}>
        {applications.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Your submitted applications will appear here.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {applications.map(application => (
              <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{application.jobTitle}</p>
                  <p className="text-xs text-gray-500">{application.company} · Applied {new Date(application.appliedAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={formatStatus(application.status)} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !applying) setSelectedJob(null) }}>
          <form onSubmit={apply} className="glass-card w-full max-w-lg space-y-4 border border-white/10 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Apply for {selectedJob.title}</h2>
                <p className="text-sm text-gray-400">{selectedJob.company}</p>
              </div>
              <button type="button" onClick={() => { setSelectedJob(null); setError('') }} disabled={applying} aria-label="Close application" className="text-gray-400 hover:text-white disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-300">Choose a PDF or DOCX resume specifically for this application. No previously uploaded profile resume will be attached.</p>
            <label className="block text-xs text-gray-400">
              Resume (max 10 MB)
              <input
                type="file"
                accept=".pdf,.docx"
                required
                onChange={event => {
                  const file = event.target.files?.[0] || null
                  if (file && !/\.(pdf|docx)$/i.test(file.name)) {
                    setResumeFile(null)
                    setError('Choose a PDF or DOCX resume.')
                    event.target.value = ''
                    return
                  }
                  if (file && file.size > 10 * 1024 * 1024) {
                    setResumeFile(null)
                    setError('Resume files must be 10 MB or smaller.')
                    event.target.value = ''
                    return
                  }
                  setError('')
                  setResumeFile(file)
                }}
                className="mt-1 block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-dark-600 file:px-3 file:py-2 file:text-xs file:text-white"
              />
            </label>
            {resumeFile && <p className="text-xs text-gray-400"><Upload className="mr-1 inline h-3 w-3" />{resumeFile.name}</p>}
            <label className="flex items-start gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 accent-amber-400" />
              I agree to share this selected resume with the recruiter who posted this job.
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setSelectedJob(null); setError('') }} disabled={applying} className="btn-outline rounded-lg border border-white/10 px-4 py-2 text-xs disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={applying || !resumeFile || !consent} className="btn-gold rounded-lg px-4 py-2 text-xs disabled:opacity-50">
                {applying ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
