import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, RadialScore, SectionCard } from '../components/UIComponents'
import { AlertCircle, CheckCircle, Download, Loader, Upload } from 'lucide-react'
import api from '../utils/api'
import { downloadCsv } from '../utils/csv'

export default function AIAnalysis() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/resume/profile')
      .then(response => { if (active) setProfile(response.data.data) })
      .catch(requestError => {
        if (active && requestError.response?.status !== 404) {
          setError(requestError.response?.data?.message || 'Could not load your AI analysis.')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const downloadReport = () => {
    if (!profile) return
    downloadCsv(`placeiq-ai-analysis-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['PlaceIQ AI Analysis Report'],
      ['Generated', new Date().toLocaleString()],
      ['Readiness score', profile.readinessScore ?? ''],
      ['Last updated', profile.lastUpdated || ''],
      [],
      ['Skills'],
      ['Skill'],
      ...(profile.skills || []).map(skill => [skill]),
      [],
      ['Skill gap analysis'],
      ['Target role', 'Gap percentage', 'Suggestion'],
      ...(profile.skillGaps || []).map(gap => [gap.domain, gap.gapPercentage, gap.suggestion])
    ])
  }

  const skillGaps = profile?.skillGaps || []

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Analysis"
        subtitle="Your latest resume analysis, readiness score, skills, and role-specific recommendations."
        action={
          <button type="button" onClick={downloadReport} disabled={!profile || loading} className="btn-outline rounded-lg border border-white/10 px-4 py-2 text-xs flex items-center gap-2 disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Download Report
          </button>
        }
      />

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-7 w-7 animate-spin text-gold-400" /></div>
      ) : !profile ? (
        <SectionCard title="Resume analysis not available">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-gray-400">Upload a resume to generate your readiness score, skill analysis, and report.</p>
            <button type="button" onClick={() => navigate('/upload-resume')} className="btn-gold rounded-lg px-4 py-2 text-xs flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> Upload Resume
            </button>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard title="Overall Readiness Score">
              <div className="flex flex-col items-center py-4">
                <RadialScore score={profile.readinessScore || 0} size={120} />
                <p className="mt-3 text-center text-xs text-gray-400">
                  {profile.lastUpdated ? `Last analyzed ${new Date(profile.lastUpdated).toLocaleDateString()}` : 'Based on your latest resume analysis'}
                </p>
              </div>
            </SectionCard>

            <SectionCard title={`Skills Found (${profile.skills?.length || 0})`} className="lg:col-span-2">
              {profile.skills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span key={skill} className="badge badge-python flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-400" /> {skill}
                    </span>
                  ))}
                </div>
              ) : <p className="py-6 text-center text-sm text-gray-500">No skills were extracted. Try uploading a text-based PDF or DOCX resume.</p>}
            </SectionCard>
          </div>

          <SectionCard title="Skill Gap Analysis">
            {skillGaps.length ? (
              <div className="space-y-3">
                {skillGaps.map((gap, index) => (
                  <article key={`${gap.domain}-${index}`} className="rounded-xl border border-white/5 bg-dark-600 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-white">{gap.domain}</h2>
                      <span className="text-xs font-mono text-gold-400">{gap.gapPercentage}% skill gap</span>
                    </div>
                    <p className="mt-2 flex items-start gap-2 text-sm text-gray-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-400" /> {gap.suggestion}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-gray-400">Choose a target role to run a skill gap analysis.</p>
                <button type="button" onClick={() => navigate('/skill-gap')} className="btn-gold rounded-lg px-4 py-2 text-xs">Analyze a Target Role</button>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
