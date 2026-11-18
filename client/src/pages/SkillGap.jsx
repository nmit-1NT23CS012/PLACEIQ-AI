import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, SectionCard } from '../components/UIComponents'
import { Target, TrendingUp, BookOpen, Loader, Search, ExternalLink, Upload } from 'lucide-react'
import api from '../utils/api'

const roles = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Data Scientist',
  'AI/ML Engineer',
  'DevOps Engineer'
]

export default function SkillGap() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer')
  const [gapData, setGapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setGapData(null)
    setError('')
    api.post('/resume/analyze-gaps', { targetRole: selectedRole })
      .then(response => { if (active) setGapData(response.data.data) })
      .catch(requestError => {
        if (!active) return
        setError(requestError.response?.status === 404
          ? 'Upload a resume before running skill gap analysis.'
          : requestError.response?.data?.message || 'Could not analyze skill gaps.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedRole])

  const missingSkills = gapData?.missing_skills || []
  const matchingSkills = gapData?.matching_skills || []

  return (
    <div className="space-y-4">
      <PageHeader title="Skill Gap Analysis" subtitle="Compare your resume skills with a target role and find focused learning resources." />

      <div className="flex flex-col items-end gap-4 md:flex-row">
        <div className="flex-1">
          <label htmlFor="target-role" className="mb-1.5 block text-xs uppercase tracking-widest text-gray-500">Select Target Role</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <select
              id="target-role"
              value={selectedRole}
              onChange={event => setSelectedRole(event.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-dark-600 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-gold-500/50"
            >
              {roles.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
        </div>
        {loading && <div role="status" className="mb-2 flex items-center gap-2 text-xs text-gold-400"><Loader className="h-3 w-3 animate-spin" /> Analyzing…</div>}
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-sm text-red-300">{error}</p>
          {error.startsWith('Upload a resume') && (
            <button type="button" onClick={() => navigate('/upload-resume')} className="btn-gold flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload Resume
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Missing Skills', value: loading ? '…' : missingSkills.length, icon: Target, color: 'text-gold-400 bg-gold-500/10' },
          { label: 'Match Rate', value: loading ? '…' : gapData ? `${gapData.match_percentage}%` : '—', icon: TrendingUp, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Target Role', value: selectedRole.split(' ')[0], icon: BookOpen, color: 'text-purple-400 bg-purple-500/10' }
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}><item.icon className="h-4 w-4" /></div>
            <span className="font-display text-xl font-bold text-white">{item.value}</span>
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      <SectionCard title={`Match Details${gapData?.target_role ? ` · ${gapData.target_role}` : ''}`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader className="h-7 w-7 animate-spin text-gold-400" /></div>
        ) : gapData ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-gold-500/10 bg-gold-500/5 p-4">
              <p className="mb-1 text-sm font-semibold text-gold-400">AI Suggestion</p>
              <p className="text-sm leading-relaxed text-gray-300">{gapData.suggestion}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-gray-500">Skill Breakdown</p>
              {matchingSkills.map(skill => (
                <div key={`matched-${skill}`} className="flex items-center justify-between rounded-lg border border-green-500/10 bg-green-500/5 p-2">
                  <span className="text-sm text-white">{skill}</span><span className="font-mono text-xs text-green-400">Matched ✓</span>
                </div>
              ))}
              {missingSkills.map(skill => (
                <div key={`missing-${skill}`} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 p-2">
                  <span className="text-sm text-white">{skill}</span><span className="font-mono text-xs text-red-400">Missing</span>
                </div>
              ))}
              {!matchingSkills.length && !missingSkills.length && <p className="text-sm text-gray-500">No individual skills were returned for this role.</p>}
            </div>
          </div>
        ) : !error ? (
          <p className="py-8 text-center text-sm text-gray-500">No skill analysis is available yet.</p>
        ) : null}
      </SectionCard>

      <SectionCard title="Learning Resources">
        {missingSkills.length ? (
          <div className="space-y-3">
            {missingSkills.map(skill => (
              <div key={skill} className="flex items-center gap-4 rounded-xl border border-white/5 bg-dark-600 p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-dark-500"><BookOpen className="h-5 w-5 text-gold-400" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{skill}</p>
                  <p className="text-xs text-gray-500">Search courses and learning materials</p>
                </div>
                <a
                  href={`https://www.coursera.org/search?query=${encodeURIComponent(skill)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
                >
                  Find a course <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        ) : loading ? (
          <p className="py-6 text-center text-sm text-gray-500">Learning resources will appear after analysis.</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-gray-500">Learning resources are unavailable until your resume is analyzed.</p>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">No missing skills were found for this target role.</p>
        )}
      </SectionCard>
    </div>
  )
}
