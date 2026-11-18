import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, SectionCard, MatchBadge } from '../components/UIComponents'
import { ExternalLink, Loader, Play, Upload } from 'lucide-react'
import api from '../utils/api'

const courses = [
  { id: 'python', title: 'Python Programming', subtitle: 'Official Python tutorial', href: 'https://docs.python.org/3/tutorial/', type: 'Courses', emoji: 'PY' },
  { id: 'sql', title: 'SQL Fundamentals', subtitle: 'Interactive SQL lessons', href: 'https://sqlbolt.com/', type: 'Courses', emoji: 'DB' },
  { id: 'react', title: 'Learn React', subtitle: 'Official React documentation', href: 'https://react.dev/learn', type: 'Courses', emoji: 'RE' },
  { id: 'ml', title: 'Machine Learning', subtitle: 'Google Machine Learning Crash Course', href: 'https://developers.google.com/machine-learning/crash-course', type: 'Courses', emoji: 'ML' }
]

const projects = [
  { id: 'portfolio', title: 'Build a Portfolio App', subtitle: 'Browse open-source portfolio project examples', href: 'https://github.com/topics/portfolio-website', type: 'Projects', emoji: 'PF' },
  { id: 'dashboard', title: 'Create a Data Dashboard', subtitle: 'Explore data visualization project examples', href: 'https://github.com/topics/data-visualization', type: 'Projects', emoji: 'DA' }
]

const tabs = ['All', 'Courses', 'Projects', 'Jobs', 'Skills']

export default function Recommended() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('All')
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/resume/profile')
      .then(response => { if (active) setProfile(response.data.data) })
      .catch(requestError => {
        if (active && requestError.response?.status !== 404) {
          setProfileError(requestError.response?.data?.message || 'Could not load your recommendations.')
        }
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (tab !== 'Jobs') return undefined

    let active = true
    setJobsLoading(true)
    setJobsError('')
    api.get('/jobs/match')
      .then(response => { if (active) setJobs(response.data.data || []) })
      .catch(requestError => {
        if (active) setJobsError(requestError.response?.data?.message || 'Could not load job recommendations.')
      })
      .finally(() => { if (active) setJobsLoading(false) })
    return () => { active = false }
  }, [tab])

  const visibleResources = tab === 'All'
    ? [...courses, ...projects]
    : [...courses, ...projects].filter(resource => resource.type === tab)
  const skillGaps = profile?.skillGaps || []

  return (
    <div className="space-y-4">
      <PageHeader title="Recommended" subtitle="Explore learning resources, project ideas, jobs, and improvements based on your PlaceIQ profile." />

      <div className="flex w-fit gap-1 overflow-x-auto rounded-lg bg-dark-700 p-1">
        {tabs.map(item => (
          <button key={item} type="button" onClick={() => setTab(item)}
            className={`rounded-md px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-wider transition-all ${tab === item ? 'bg-gold-500 text-dark-900' : 'text-gray-400 hover:text-white'}`}>
            {item}
          </button>
        ))}
      </div>

      {(tab === 'All' || tab === 'Courses' || tab === 'Projects') && (
        <SectionCard title={tab === 'All' ? 'Learning and Project Resources' : tab}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visibleResources.map(resource => (
              <article key={resource.id} className="glass-card border border-white/5 p-4 transition-all hover:border-gold-500/20">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 font-display text-sm font-bold text-gold-400">{resource.emoji}</div>
                <p className="mb-1 text-sm font-semibold text-white">{resource.title}</p>
                <p className="mb-4 min-h-8 text-xs text-gray-500">{resource.subtitle}</p>
                <a href={resource.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-gray-300 hover:border-gold-500/30 hover:text-gold-300">
                  <Play className="h-3 w-3" /> Open resource <ExternalLink className="h-3 w-3" />
                </a>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === 'Jobs' && (
        <SectionCard title="Recommended Jobs">
          {jobsLoading ? (
            <div className="flex justify-center py-10"><Loader className="h-6 w-6 animate-spin text-gold-400" /></div>
          ) : jobsError ? (
            <div className="space-y-3 py-6 text-center">
              <p role="alert" className="text-sm text-red-400">{jobsError}</p>
              {jobsError.toLowerCase().includes('resume') && <button type="button" onClick={() => navigate('/upload-resume')} className="btn-gold inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs"><Upload className="h-3.5 w-3.5" /> Upload Resume</button>}
            </div>
          ) : jobs.length ? (
            <div className="space-y-3">
              {jobs.map(job => (
                <article key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-dark-600 p-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-white">{job.title}</h2>
                    <p className="text-xs text-gray-400">{job.company} · {job.location}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MatchBadge score={job.match} />
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-gold flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs">View <ExternalLink className="h-3 w-3" /></a>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-gray-500">No matching jobs were found right now.</p>}
        </SectionCard>
      )}

      {tab === 'Skills' && (
        <SectionCard title="Skills to Improve">
          {profileError ? (
            <p role="alert" className="py-6 text-center text-sm text-red-400">{profileError}</p>
          ) : !profile ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-gray-400">Upload and analyze your resume to receive role-specific skill recommendations.</p>
              <button type="button" onClick={() => navigate('/upload-resume')} className="btn-gold flex items-center gap-2 rounded-lg px-4 py-2 text-xs"><Upload className="h-3.5 w-3.5" /> Upload Resume</button>
            </div>
          ) : skillGaps.length ? (
            <div className="space-y-3">
              {skillGaps.map((gap, index) => (
                <div key={`${gap.domain}-${index}`} className="rounded-xl border border-white/5 bg-dark-600 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{gap.domain}</p>
                    <span className="text-xs text-gold-400">{gap.gapPercentage}% skill gap</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{gap.suggestion}</p>
                </div>
              ))}
              <button type="button" onClick={() => navigate('/skill-gap')} className="btn-gold rounded-lg px-4 py-2 text-xs">Analyze another role</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-gray-400">Run a role-specific analysis to find skills to improve.</p>
              <button type="button" onClick={() => navigate('/skill-gap')} className="btn-gold rounded-lg px-4 py-2 text-xs">Analyze a Target Role</button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
