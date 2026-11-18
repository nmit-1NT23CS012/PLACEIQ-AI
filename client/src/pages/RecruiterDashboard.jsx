import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, StatCard, SectionCard, StatusBadge, MatchBadge } from '../components/UIComponents'
import { Briefcase, Users, TrendingUp, PlusCircle, Loader, Zap, FileText } from 'lucide-react'
import api from '../utils/api'

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [applications, setApplications] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jd, setJd] = useState('')
  const [requiredSkills, setRequiredSkills] = useState([])
  const [matching, setMatching] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [matchError, setMatchError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/recruiters/jobs'), api.get('/recruiters/candidates'), api.get('/recruiters/applications')])
      .then(([jobsResponse, candidatesResponse, applicationsResponse]) => {
        setJobs(jobsResponse.data.data)
        setCandidates(candidatesResponse.data.data)
        setApplications(applicationsResponse.data.data)
      })
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load recruiter dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedJob = useMemo(() => jobs.find(job => job.id === selectedJobId), [jobs, selectedJobId])
  const openJobs = jobs.filter(job => job.status === 'open').length
  const averageReadiness = candidates.length
    ? Math.round(candidates.reduce((total, candidate) => total + (candidate.readinessScore || 0), 0) / candidates.length)
    : 0

  const selectJob = (jobId) => {
    setSelectedJobId(jobId)
    const job = jobs.find(item => item.id === jobId)
    if (job) {
      setJd(`${job.title}\n${job.description}`)
      setRequiredSkills(job.requiredSkills || [])
    }
  }

  const handleMatch = async () => {
    if (!jd.trim()) {
      setMatchError('Enter a job description or select one of your jobs.')
      return
    }
    setMatching(true)
    setMatchError('')
    setResults([])
    try {
      const response = await api.post('/recruiters/match', {
        title: selectedJob?.title || 'Job Posting',
        description: jd,
        requiredSkills
      })
      setResults(response.data.data || [])
    } catch (requestError) {
      setMatchError(requestError.response?.data?.message || 'Could not match candidates.')
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Recruiter Dashboard" subtitle="Manage your job postings and find candidates."
        action={
          <button onClick={() => navigate('/recruiter/post-job')} className="btn-gold px-4 py-2 rounded-lg text-xs flex items-center gap-2">
            <PlusCircle className="w-3.5 h-3.5" /> Post Job
          </button>
        }
      />

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Jobs Posted" value={loading ? '…' : jobs.length} icon={Briefcase} color="gold" />
        <StatCard label="Open Jobs" value={loading ? '…' : openJobs} icon={TrendingUp} color="green" />
        <StatCard label="Applications" value={loading ? '…' : applications.length} icon={FileText} color="purple" />
        <StatCard label="Candidate Profiles" value={loading ? '…' : candidates.length} icon={Users} color="blue" />
        <StatCard label="Average Readiness" value={loading ? '…' : `${averageReadiness}%`} icon={TrendingUp} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="AI Candidate Matcher" className="lg:col-span-2">
          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">Select a posted job or paste a description to rank candidates by skills, resume relevance, and readiness.</p>
            <select value={selectedJobId} onChange={event => selectJob(event.target.value)} className="input-dark w-full bg-dark-600 text-sm">
              <option value="">Paste a job description</option>
              {jobs.map(job => <option key={job.id} value={job.id}>{job.title} · {job.company}</option>)}
            </select>
            <div className="relative">
              <textarea
                value={jd}
                onChange={event => { setSelectedJobId(''); setJd(event.target.value) }}
                placeholder="Paste Job Description here..."
                className="w-full h-32 bg-dark-600 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-gold-500/50 outline-none resize-none"
              />
              <div className="absolute bottom-3 right-3">
                <button onClick={handleMatch} disabled={matching || !jd.trim()} className="btn-gold px-4 py-2 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {matching ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {matching ? 'Analyzing Pool...' : 'Start AI Match'}
                </button>
              </div>
            </div>
            {matchError && <p role="alert" className="text-xs text-red-400">{matchError}</p>}
          </div>
        </SectionCard>

        <SectionCard title="AI Ranked Results"
          action={<button onClick={() => navigate('/recruiter/candidates')} className="text-xs text-gold-400 hover:text-gold-300">View Candidates</button>}>
          <div className="space-y-2">
            {results.length > 0 ? results.slice(0, 5).map((candidate, index) => (
              <div key={candidate.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-600 border border-white/5">
                <span className="text-xs text-gray-500 font-mono w-4">{index + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500/20 to-accent-blue/20 border border-gold-500/20 flex items-center justify-center text-xs font-bold font-display text-gold-400">
                  {(candidate.title_or_name || 'C').split(' ').map(part => part[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{candidate.title_or_name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{candidate.explanation}</p>
                </div>
                <MatchBadge score={candidate.score} />
              </div>
            )) : (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center"><Users className="w-5 h-5 text-gray-600" /></div>
                <p className="text-xs text-gray-600 px-4 italic">{matching ? 'Matching candidates...' : 'Submit a job description to see ranked candidates.'}</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent Job Posts"
        action={<button onClick={() => navigate('/recruiter/post-job')} className="text-xs text-gold-400 hover:text-gold-300">Manage Jobs</button>}>
        {loading ? (
          <div className="flex justify-center py-6"><Loader className="w-5 h-5 animate-spin text-gold-400" /></div>
        ) : jobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No jobs posted yet. Use Post Job to create your first posting.</p>
        ) : (
          <div className="space-y-0 divide-y divide-white/5">
            {jobs.slice(0, 5).map(job => (
              <div key={job.id} className="grid grid-cols-3 items-center gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-200">{job.title}</p>
                  <p className="truncate text-xs text-gray-500">{job.company}</p>
                </div>
                <span className="text-center text-xs text-gray-500">{job.requiredSkills?.length || 0} required skills</span>
                <div className="flex justify-end"><StatusBadge status={job.status === 'open' ? 'Active' : 'Closed'} /></div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent Applicants"
        action={<button onClick={() => navigate('/recruiter/applications')} className="text-xs text-gold-400 hover:text-gold-300">View Applications</button>}>
        {applications.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Applicants will appear here when students apply to your jobs.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {applications.slice(0, 5).map(application => (
              <div key={application.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{application.studentName || 'Student'}</p>
                  <p className="text-xs text-gray-500">{application.jobTitle} · {application.company}</p>
                </div>
                <StatusBadge status={application.status?.charAt(0).toUpperCase() + application.status?.slice(1)} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
