import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader, SectionCard } from '../components/UIComponents'
import { Loader, Search } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const formatDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : '—'

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get('/admin/users')
      .then(response => setUsers(response.data.data || []))
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load users.'))
      .finally(() => setLoading(false))
  }, [])

  const displayedUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter(user => {
      const matchesSearch = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      return matchesSearch && (!role || user.role === role)
    })
  }, [users, search, role])

  const toggleUserStatus = async targetUser => {
    const disabled = !targetUser.disabled
    const action = disabled ? 'disable' : 'reactivate'
    if (!window.confirm(`${action === 'disable' ? 'Disable' : 'Reactivate'} ${targetUser.name}? ${disabled ? 'They will no longer be able to sign in; their data will be retained.' : 'They will be able to sign in again.'}`)) return

    setUpdatingId(targetUser.id)
    setError('')
    setNotice('')
    try {
      await api.patch(`/admin/users/${targetUser.id}/status`, { disabled })
      setUsers(current => current.map(item => item.id === targetUser.id ? { ...item, disabled } : item))
      setNotice(`${targetUser.name} was ${disabled ? 'disabled' : 'reactivated'}.`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not ${action} this account.`)
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Users" subtitle="Search accounts, review roles, and disable or reactivate access without deleting user data." />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search users" placeholder="Search name or email..." className="input-dark pl-9 text-xs" />
        </div>
        <select value={role} onChange={event => setRole(event.target.value)} aria-label="Filter users by role" className="input-dark min-w-36 bg-dark-600 text-xs">
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="recruiter">Recruiters</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <SectionCard title={`Registered Users (${displayedUsers.length})`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader className="h-6 w-6 animate-spin text-gold-400" /></div>
        ) : displayedUsers.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No users match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Joined</th><th className="pb-3">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {displayedUsers.map(user => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 text-sm text-white">{user.name}</td>
                    <td className="py-3 pr-4 text-sm text-gray-400">{user.email || '—'}</td>
                    <td className="py-3 pr-4"><span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs capitalize text-blue-300">{user.role}</span></td>
                    <td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-xs ${user.disabled ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'}`}>{user.disabled ? 'Disabled' : 'Active'}</span></td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(user)}
                        disabled={updatingId === user.id || (user.id === currentUser?.uid && !user.disabled)}
                        className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${user.disabled ? 'border-green-500/20 text-green-300 hover:bg-green-500/10' : 'border-red-500/20 text-red-300 hover:bg-red-500/10'}`}
                      >
                        {updatingId === user.id ? 'Saving…' : user.disabled ? 'Reactivate' : 'Disable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
