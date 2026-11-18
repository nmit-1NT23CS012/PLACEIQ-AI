import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, StatCard, SectionCard, StatusBadge } from '../components/UIComponents'
import { Users, Briefcase, FileText, Cpu, Loader } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../utils/api'

const colors = ['#4f8ef7', '#f5a623', '#22c55e', '#7c5cbf', '#ef4444', '#14b8a6']
const toLabel = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'
const formatDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : '—'

const ChartTooltip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="glass-card px-3 py-2 text-xs">
    <p className="text-gray-400">{label || payload[0].name}</p>
    <p className="font-bold text-gold-400">{payload[0].value}</p>
  </div>
) : null

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/admin/overview')
      .then(response => { if (active) setStats(response.data.data) })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || 'Could not load admin overview.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const roleData = Object.entries(stats?.usersByRole || {}).map(([name, count]) => ({ name: toLabel(name), count }))
  const applicationData = (stats?.applicationStats || []).map((item, index) => ({
    name: toLabel(item._id),
    value: item.count,
    color: colors[index % colors.length]
  }))

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Dashboard" subtitle="Live platform overview from registered users, student profiles, jobs, and applications."
        action={<button type="button" onClick={() => navigate('/admin/jobs')} className="btn-gold rounded-lg px-4 py-2 text-xs">Manage Jobs</button>}
      />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader className="h-8 w-8 animate-spin text-gold-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Registered Users" value={stats?.totalUsers ?? 0} icon={Users} color="blue" />
            <StatCard label="Open Job Posts" value={stats?.openJobs ?? 0} icon={Briefcase} color="gold" />
            <StatCard label="Average Readiness" value={`${Math.round(stats?.overallReadiness || 0)}%`} icon={Cpu} color="green" />
            <StatCard label="Applications" value={stats?.totalApplications ?? 0} icon={FileText} color="purple" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Users by Role">
              {roleData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={roleData}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Users" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-12 text-center text-sm text-gray-500">No registered users yet.</p>}
            </SectionCard>

            <SectionCard title="Applications by Status">
              {applicationData.length ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={220}>
                    <PieChart>
                      <Pie data={applicationData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3} dataKey="value">
                        {applicationData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {applicationData.map(item => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                        <span className="text-gray-400">{item.name}</span>
                        <span className="ml-auto font-mono text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="py-12 text-center text-sm text-gray-500">No applications have been submitted.</p>}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Recent Job Posts" action={<button type="button" onClick={() => navigate('/admin/jobs')} className="text-xs text-gold-400 hover:underline">View all</button>}>
              {stats?.recentJobs?.length ? stats.recentJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.company} · {formatDate(job.createdAt)}</p>
                  </div>
                  <StatusBadge status={job.status === 'open' ? 'Active' : 'Closed'} />
                </div>
              )) : <p className="py-8 text-center text-sm text-gray-500">No job posts yet.</p>}
            </SectionCard>

            <SectionCard title="Recent Applications" action={<button type="button" onClick={() => navigate('/admin/applications')} className="text-xs text-gold-400 hover:underline">View all</button>}>
              {stats?.recentApplications?.length ? stats.recentApplications.map(application => (
                <div key={application.id} className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{application.studentName}</p>
                    <p className="truncate text-xs text-gray-500">{application.jobTitle} · {formatDate(application.appliedAt)}</p>
                  </div>
                  <StatusBadge status={toLabel(application.status)} />
                </div>
              )) : <p className="py-8 text-center text-sm text-gray-500">No applications yet.</p>}
            </SectionCard>
          </div>

          <SectionCard title="Most Common Student Skills">
            {stats?.topSkills?.length ? (
              <div className="flex flex-wrap gap-2">
                {stats.topSkills.map(skill => <span key={skill.name} className="badge badge-python">{skill.name} · {skill.count}</span>)}
              </div>
            ) : <p className="text-sm text-gray-500">Skills appear after students upload resumes.</p>}
          </SectionCard>
        </>
      )}
    </div>
  )
}
