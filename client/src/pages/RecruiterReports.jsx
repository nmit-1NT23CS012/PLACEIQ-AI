import React, { useEffect, useState } from 'react'
import { PageHeader, SectionCard, StatCard } from '../components/UIComponents'
import { Briefcase, Download, Loader, Users } from 'lucide-react'
import api from '../utils/api'
import { downloadCsv } from '../utils/csv'

export default function RecruiterReports() {
  const [jobs, setJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/recruiters/jobs'), api.get('/recruiters/candidates')])
      .then(([jobsResponse, candidatesResponse]) => {
        setJobs(jobsResponse.data.data)
        setCandidates(candidatesResponse.data.data)
      })
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load report data.'))
      .finally(() => setLoading(false))
  }, [])

  const downloadReport = () => {
    const rows = [
      ['PlaceIQ Recruiter Report'],
      ['Generated', new Date().toLocaleString()],
      ['Total jobs', jobs.length],
      ['Open jobs', jobs.filter(job => job.status === 'open').length],
      ['Candidate profiles', candidates.length],
      [],
      ['Job postings'],
      ['Title', 'Company', 'Status', 'Required skills', 'Created'],
      ...jobs.map(job => [job.title, job.company, job.status, (job.requiredSkills || []).join('; '), job.createdAt || '']),
      [],
      ['Candidate profiles'],
      ['Name', 'Email', 'Readiness score', 'Skills'],
      ...candidates.map(candidate => [candidate.name, candidate.email, candidate.readinessScore, (candidate.skills || []).join('; ')])
    ]
    downloadCsv(`placeiq-recruiter-report-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Recruiter Reports" subtitle="Download a CSV snapshot of your job postings and candidate pool." />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-7 h-7 animate-spin text-gold-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Job Postings" value={jobs.length} icon={Briefcase} color="gold" />
            <StatCard label="Candidate Profiles" value={candidates.length} icon={Users} color="blue" />
          </div>
          <SectionCard title="Export">
            <p className="mb-4 text-sm text-gray-400">The report includes job titles, companies, status, required skills, and candidates’ readiness scores and extracted skills.</p>
            <button type="button" onClick={downloadReport} disabled={Boolean(error)} className="btn-gold rounded-lg px-4 py-2 text-xs flex items-center gap-2 disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> Download CSV Report
            </button>
          </SectionCard>
        </>
      )}
    </div>
  )
}
