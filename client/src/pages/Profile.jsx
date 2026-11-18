import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageHeader, SectionCard } from '../components/UIComponents'
import { MapPin, Mail, Plus, CheckCircle, Edit3, X, Save } from 'lucide-react'
import api from '../utils/api'

const tabs = ['Overview', 'Education', 'Experience', 'Skills', 'Certificates']

export default function Profile() {
  const { user, updateUserProfile } = useAuth()
  const navigate = useNavigate()
  const [resumeProfile, setResumeProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', location: '', headline: '', about: '', skills: '', education: '', experience: '', certificates: '' })
  const skills = [...new Set([...(resumeProfile?.skills || []), ...(user?.profileSkills || [])])]
  const profileTasks = [
    { label: 'Add Skills', done: skills.length > 0, action: () => openEditor() },
    ...(user?.role === 'student' ? [{ label: 'Upload Resume', done: Boolean(resumeProfile), action: () => navigate('/upload-resume') }] : []),
    { label: 'Complete Profile', done: Boolean(user?.location && user?.about), action: () => openEditor() },
  ]
  const strength = Math.round(([
    Boolean(user?.name),
    Boolean(user?.location),
    Boolean(user?.headline),
    Boolean(user?.about),
    Boolean(user?.education),
    Boolean(user?.experience),
    Boolean(user?.certificates),
    skills.length > 0,
    Boolean(resumeProfile)
  ].filter(Boolean).length / 9) * 100)

  useEffect(() => {
    if (user?.role !== 'student') return

    let active = true
    api.get('/resume/profile')
      .then(response => { if (active) setResumeProfile(response.data.data) })
      .catch(requestError => {
        if (active && requestError.response?.status !== 404) {
          setError(requestError.response?.data?.message || 'Could not load resume details.')
        }
      })
    return () => { active = false }
  }, [user?.role])

  const openEditor = () => {
    setForm({
      name: user?.name || '',
      location: user?.location || '',
      headline: user?.headline || '',
      about: user?.about || '',
      skills: (user?.profileSkills || []).join(', '),
      education: user?.education || '',
      experience: user?.experience || '',
      certificates: user?.certificates || ''
    })
    setError('')
    setEditing(true)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateUserProfile({
        name: form.name.trim(),
        location: form.location.trim(),
        headline: form.headline.trim(),
        about: form.about.trim(),
        profileSkills: [...new Set(form.skills.split(',').map(skill => skill.trim()).filter(Boolean))],
        education: form.education.trim(),
        experience: form.experience.trim(),
        certificates: form.certificates.trim()
      })
      setEditing(false)
    } catch (saveError) {
      setError(saveError.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const emptyState = (label) => (
    <p className="text-sm text-gray-500 text-center py-8">No {label} available yet.</p>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile"
        subtitle="Manage your personal and professional information."
        action={<button onClick={openEditor} className="btn-gold px-4 py-2 rounded-lg text-xs flex items-center gap-2"><Edit3 className="w-3.5 h-3.5" /> Edit Profile</button>}
      />
      {error && !editing && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Profile Card */}
        <div className="space-y-3">
          <SectionCard>
            <div className="text-center pb-4">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-500/20 to-accent-blue/20 border-2 border-gold-500/30 flex items-center justify-center text-2xl font-bold font-display text-gold-400">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'JD'}
                </div>
                <button type="button" onClick={openEditor} aria-label="Edit profile" className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center">
                  <Edit3 className="w-3 h-3 text-dark-900" />
                </button>
              </div>
              <h2 className="text-lg font-bold font-display text-white">{user?.name || 'Your Name'}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{user?.headline || `${user?.role || 'User'} profile`}</p>
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-500">
                <Mail className="w-3 h-3" /> {user?.email || 'No email set'}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5 text-xs text-gray-500">
                <MapPin className="w-3 h-3" /> {user?.location || 'Add your location'}
              </div>
              <button onClick={openEditor} className="btn-outline w-full mt-3 py-2 rounded-lg text-xs border border-white/10">Edit Profile</button>
            </div>
          </SectionCard>

          {/* Profile Strength */}
          <SectionCard title="Profile Strength">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white font-display">{strength >= 80 ? 'Strong' : strength >= 50 ? 'Good' : 'Getting started'}</span>
                <span className="text-gold-400 font-mono font-bold">{strength}%</span>
              </div>
              <div className="skill-bar-track">
                <div className="skill-bar-fill bg-gold-500" style={{ width: `${strength}%` }} />
              </div>
              <div className="space-y-1.5 mt-2">
                {profileTasks.map(t => (
                  <button type="button" key={t.label} onClick={t.action} className="flex items-center gap-2 w-full text-left">
                    <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${t.done ? 'text-green-400' : 'text-gray-600'}`} />
                    <span className={`text-xs ${t.done ? 'text-gray-400 line-through' : 'text-gray-300'}`}>{t.label}</span>
                    {!t.done && <Plus className="w-3 h-3 text-gold-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: Detail Panel */}
        <div className="lg:col-span-2 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-dark-700 rounded-lg p-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold whitespace-nowrap uppercase tracking-wider transition-all ${activeTab === t ? 'bg-gold-500 text-dark-900' : 'text-gray-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <div className="space-y-3">
              <SectionCard title="About Me">
                <p className="text-sm text-gray-400 leading-relaxed">{user?.about || 'Add a short introduction to your profile.'}</p>
              </SectionCard>
              <SectionCard title="Skills">
                <div className="flex flex-wrap gap-2">
                  {skills.length ? skills.map(skill => <span key={skill} className="badge badge-python">{skill}</span>) : emptyState('skills')}
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === 'Education' && (
            <SectionCard title="Education">
              <div className="space-y-2">
                {user?.education && <p className="whitespace-pre-wrap text-sm text-gray-300">{user.education}</p>}
                {resumeProfile?.academicRecord?.cgpa != null && <p className="text-sm text-gray-300">CGPA: {resumeProfile.academicRecord.cgpa}</p>}
                {!user?.education && resumeProfile?.academicRecord?.cgpa == null && emptyState('education details')}
              </div>
            </SectionCard>
          )}

          {activeTab === 'Experience' && (
            <SectionCard title="Experience">
              {user?.experience ? <p className="whitespace-pre-wrap text-sm text-gray-300">{user.experience}</p> : emptyState('experience')}
            </SectionCard>
          )}

          {activeTab === 'Skills' && (
            <SectionCard title="All Skills">
              {skills.length
                ? <div className="grid grid-cols-2 gap-3">{skills.map(skill => <div key={skill} className="flex items-center gap-2 p-2 rounded-lg bg-dark-600 border border-white/5 text-xs text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-gold-400" />{skill}</div>)}</div>
                : emptyState('skills')}
            </SectionCard>
          )}

          {activeTab === 'Certificates' && (
            <SectionCard title="Certificates">
              {user?.certificates ? <p className="whitespace-pre-wrap text-sm text-gray-300">{user.certificates}</p> : emptyState('certificates')}
            </SectionCard>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(false) }}>
          <form onSubmit={saveProfile} className="glass-card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
              <button type="button" onClick={() => setEditing(false)} aria-label="Close profile editor" className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-xs text-gray-400">Name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="input-dark mt-1 w-full" /></label>
            <label className="block text-xs text-gray-400">Location<input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} className="input-dark mt-1 w-full" /></label>
            <label className="block text-xs text-gray-400">Professional headline<input value={form.headline} onChange={event => setForm({ ...form, headline: event.target.value })} className="input-dark mt-1 w-full" /></label>
            <label className="block text-xs text-gray-400">About<textarea value={form.about} onChange={event => setForm({ ...form, about: event.target.value })} className="input-dark mt-1 w-full min-h-24" /></label>
            <label className="block text-xs text-gray-400">Additional skills (comma separated)<input value={form.skills} onChange={event => setForm({ ...form, skills: event.target.value })} className="input-dark mt-1 w-full" /></label>
            <label className="block text-xs text-gray-400">Education<textarea value={form.education} onChange={event => setForm({ ...form, education: event.target.value })} className="input-dark mt-1 w-full min-h-20" placeholder="Degree, institution, graduation year" /></label>
            <label className="block text-xs text-gray-400">Experience<textarea value={form.experience} onChange={event => setForm({ ...form, experience: event.target.value })} className="input-dark mt-1 w-full min-h-20" placeholder="Role, organization, and key achievements" /></label>
            <label className="block text-xs text-gray-400">Certificates<textarea value={form.certificates} onChange={event => setForm({ ...form, certificates: event.target.value })} className="input-dark mt-1 w-full min-h-20" placeholder="Certificate name and issuing organization" /></label>
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-outline px-4 py-2 rounded-lg text-xs border border-white/10">Cancel</button>
              <button type="submit" disabled={saving} className="btn-gold px-4 py-2 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save Profile'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
