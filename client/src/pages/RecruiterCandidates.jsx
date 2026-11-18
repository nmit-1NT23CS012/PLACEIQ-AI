import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader, MatchBadge, SectionCard } from '../components/UIComponents'
import { Search, Eye, Loader, X } from 'lucide-react'
import api from '../utils/api'

export default function RecruiterCandidates() {
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [matchResults, setMatchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const pageSize = 10

  useEffect(() => {
    Promise.all([api.get('/recruiters/candidates'), api.get('/recruiters/jobs')])
      .then(([candidateResponse, jobResponse]) => {
        setCandidates(candidateResponse.data.data)
        setJobs(jobResponse.data.data)
      })
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load candidates.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!jobFilter) {
      setMatchResults([])
      setError('')
      return
    }

    const job = jobs.find(item => item.id === jobFilter)
    if (!job) return

    let active = true
    setMatching(true)
    setError('')
    api.post('/recruiters/match', {
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills || []
    })
      .then(response => { if (active) setMatchResults(response.data.data || []) })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || 'Could not match candidates to this job.') })
      .finally(() => { if (active) setMatching(false) })

    return () => { active = false }
  }, [jobFilter, jobs])

  const displayedCandidates = useMemo(() => {
    const candidateById = new Map(candidates.map(candidate => [candidate.id, candidate]))
    const source = jobFilter
      ? matchResults.map(result => ({
          ...candidateById.get(result.id),
          matchScore: result.score,
          explanation: result.explanation
        })).filter(candidate => candidate.id)
      : candidates.map(candidate => ({ ...candidate, matchScore: null }))
    const searchText = search.trim().toLowerCase()

    return source.filter(candidate => {
      const matchesSearch = !searchText
        || candidate.name.toLowerCase().includes(searchText)
        || candidate.email.toLowerCase().includes(searchText)
        || candidate.skills.some(skill => skill.toLowerCase().includes(searchText))
      const matchesSkill = !skillFilter || candidate.skills.some(skill => skill.toLowerCase() === skillFilter.toLowerCase())
      return matchesSearch && matchesSkill
    })
  }, [candidates, jobFilter, matchResults, search, skillFilter])

  useEffect(() => setPage(1), [search, skillFilter, jobFilter])

  const pageCount = Math.max(1, Math.ceil(displayedCandidates.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageCandidates = displayedCandidates.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const skillOptions = [...new Set(candidates.flatMap(candidate => candidate.skills || []))].sort()

  const showCandidate = async (id) => {
    setDetailLoading(true)
    setError('')
    try {
      const response = await api.get(`/recruiters/candidate/${id}`)
      setSelectedCandidate(response.data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load candidate details.')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Candidates" subtitle="Search student profiles and rank them against your job postings." />

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, or skill..." className="input-dark pl-9 text-xs py-2" />
        </div>
        <select value={jobFilter} onChange={event => setJobFilter(event.target.value)} className="input-dark text-xs py-2 min-w-40 bg-dark-600">
          <option value="">All candidates</option>
          {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
        <select value={skillFilter} onChange={event => setSkillFilter(event.target.value)} className="input-dark text-xs py-2 min-w-32 bg-dark-600">
          <option value="">All skills</option>
          {skillOptions.map(skill => <option key={skill} value={skill}>{skill}</option>)}
        </select>
      </div>

      <SectionCard title={`Candidates (${displayedCandidates.length})`}>
        {loading || matching ? (
          <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gold-400" /></div>
        ) : displayedCandidates.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">{candidates.length ? 'No candidates match these filters.' : 'No student profiles are available yet.'}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Candidate', 'Skills', 'CGPA', jobFilter ? 'Job Match' : 'Readiness', 'Action'].map(heading => (
                      <th key={heading} className="text-left pb-3 text-xs text-gray-500 uppercase tracking-wider font-display pr-4">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pageCandidates.map(candidate => (
                    <tr key={candidate.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="text-sm text-white font-medium whitespace-nowrap">{candidate.name}</p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">{candidate.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-1 flex-wrap">
                          {(candidate.skills || []).slice(0, 5).map(skill => <span key={skill} className="badge badge-python">{skill}</span>)}
                          {candidate.skills?.length > 5 && <span className="text-xs text-gray-500">+{candidate.skills.length - 5}</span>}
                          {!candidate.skills?.length && <span className="text-xs text-gray-500">No skills added</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-400">{candidate.cgpa ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {candidate.matchScore != null
                          ? <MatchBadge score={candidate.matchScore} />
                          : <span className="text-sm text-gray-300">{candidate.readinessScore}%</span>}
                      </td>
                      <td className="py-3">
                        <button type="button" onClick={() => showCandidate(candidate.id)} className="btn-outline px-3 py-1.5 rounded-lg text-xs border border-white/10 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <span className="text-xs text-gray-500">Page {currentPage} of {pageCount}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={currentPage === 1} className="btn-outline rounded border border-white/10 px-3 py-1 text-xs disabled:opacity-40">Previous</button>
                <button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="btn-outline rounded border border-white/10 px-3 py-1 text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {detailLoading && <div role="status" className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"><Loader className="w-8 h-8 animate-spin text-gold-400" /></div>}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedCandidate(null) }}>
          <div className="glass-card w-full max-w-xl space-y-4 border border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedCandidate.user.name}</h2>
                <p className="text-sm text-gray-400">{selectedCandidate.user.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedCandidate(null)} aria-label="Close candidate details" className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gold-400">Readiness score: {selectedCandidate.readinessScore}%</p>
            <div>
              <h3 className="mb-2 text-xs uppercase text-gray-500">Skills</h3>
              <div className="flex flex-wrap gap-2">{selectedCandidate.skills?.length ? selectedCandidate.skills.map(skill => <span key={skill} className="badge badge-python">{skill}</span>) : <span className="text-sm text-gray-500">No skills available</span>}</div>
            </div>
            {selectedCandidate.academicRecord?.cgpa != null && <p className="text-sm text-gray-300">CGPA: {selectedCandidate.academicRecord.cgpa}</p>}
            {selectedCandidate.skillGaps?.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs uppercase text-gray-500">Recommended improvements</h3>
                <ul className="space-y-1">{selectedCandidate.skillGaps.map((gap, index) => <li key={`${gap.domain}-${index}`} className="text-sm text-gray-300">{gap.domain}: {gap.suggestion}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
