import React, { useState, useEffect, useMemo } from 'react'
import { PageHeader, MatchBadge, SectionCard } from '../components/UIComponents'
import { MapPin, Clock, Bookmark, ExternalLink, Filter } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const badgeColor = { Python: 'python', 'Machine Learning': 'ml', SQL: 'sql', TensorFlow: 'tf', 'Node.js': 'node', Express: 'node', MongoDB: 'ml', Excel: 'excel', 'Power BI': 'excel', React: 'react', TypeScript: 'react', CSS: 'react', ML: 'ml' }

export default function MatchedJobs() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Best Matches')
  const [saved, setSaved] = useState({})
  const [savedStorageKey, setSavedStorageKey] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [minimumMatch, setMinimumMatch] = useState('0')
  const storageKey = user?.uid ? `placeiq:saved-jobs:${user.uid}` : ''

  useEffect(() => {
    if (!storageKey) return
    setStorageWarning('')
    try {
      const savedJobs = window.localStorage.getItem(storageKey)
      const parsed = savedJobs ? JSON.parse(savedJobs) : {}
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Saved jobs data is invalid.')
      }
      setSaved(parsed)
    } catch {
      setSaved({})
      setStorageWarning('Saved jobs could not be loaded from this browser.')
    } finally {
      setSavedStorageKey(storageKey)
    }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || savedStorageKey !== storageKey) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(saved))
    } catch {
      setStorageWarning('Browser storage is unavailable; saved jobs will last only for this session.')
    }
  }, [saved, savedStorageKey, storageKey])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        const res = await api.get('/jobs/match')
        setJobs(res.data.data || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch jobs')
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  const tabs = ['Best Matches', 'Recent', 'Saved Jobs']
  const displayJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = jobs.filter(job => {
      const isSaved = saved[job.id] ?? job.saved === true
      const matchesTab = tab !== 'Saved Jobs' || isSaved
      const searchableText = [job.title, job.company, job.location, ...(job.skills || [])].join(' ').toLowerCase()
      return matchesTab
        && (!query || searchableText.includes(query))
        && (Number(job.match) || 0) >= Number(minimumMatch)
    })

    if (tab === 'Recent') {
      return filtered.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
    }
    return filtered.sort((a, b) => (Number(b.match) || 0) - (Number(a.match) || 0))
  }, [jobs, minimumMatch, saved, search, tab])

  const toggleSaved = jobId => {
    setSaved(current => ({ ...current, [jobId]: !current[jobId] }))
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Matched Jobs" subtitle="AI-curated job matches based on your profile and skills." />

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-dark-700 rounded-lg p-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-display font-semibold uppercase tracking-wider transition-all ${tab === t ? 'bg-gold-500 text-dark-900' : 'text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen} className="btn-outline px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-white/10">
          <Filter className="w-3 h-3" /> Filter
        </button>
      </div>

      {filtersOpen && (
        <div className="grid gap-3 rounded-xl border border-white/5 bg-dark-700 p-3 sm:grid-cols-2">
          <label className="text-xs text-gray-400">
            Search title, company, location, or skill
            <input value={search} onChange={event => setSearch(event.target.value)} className="input-dark mt-1 w-full" placeholder="e.g. React or Remote" />
          </label>
          <label className="text-xs text-gray-400">
            Minimum match score
            <select value={minimumMatch} onChange={event => setMinimumMatch(event.target.value)} className="input-dark mt-1 w-full bg-dark-600">
              <option value="0">Any score</option>
              <option value="50">50% or higher</option>
              <option value="70">70% or higher</option>
              <option value="90">90% or higher</option>
            </select>
          </label>
        </div>
      )}

      {storageWarning && <p role="status" className="text-xs text-amber-300">{storageWarning}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <p className="text-gray-400 text-sm">Fetching and matching live jobs from market...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center py-10">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : displayJobs.length === 0 ? (
        <div className="flex justify-center py-10">
          <p className="text-gray-400 text-sm">{tab === 'Saved Jobs' && jobs.length && !search && minimumMatch === '0' ? 'You have not saved any jobs yet.' : 'No jobs match these filters.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
        {displayJobs.map(job => (
          <div key={job.id} className="glass-card p-4 hover:border-gold-500/20 transition-all duration-200 border border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {job.logo ? (
                  <img src={job.logo} alt={job.company} className="w-10 h-10 rounded-xl object-contain bg-white flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-dark-500 border border-white/10 flex items-center justify-center flex-shrink-0 text-lg">
                    {job.title?.[0] || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                    <MatchBadge score={job.match} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{job.company}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{job.type}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(job.skills || []).map(s => (
                      <span key={s} className={`badge badge-${badgeColor[s] || 'python'}`}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-gold px-4 py-2 rounded-lg text-xs flex items-center gap-1 justify-center">
                  View <ExternalLink className="w-3 h-3" />
                </a>}
                <button type="button" aria-label={`${saved[job.id] ? 'Remove saved' : 'Save'} ${job.title}`} aria-pressed={Boolean(saved[job.id])} onClick={() => toggleSaved(job.id)}
                  className={`btn-outline px-4 py-2 rounded-lg text-xs border border-white/10 flex items-center justify-center ${saved[job.id] ? 'text-gold-400' : ''}`}>
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}
