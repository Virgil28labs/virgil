import { useAuth } from '../contexts/AuthContext'
import { RaccoonMascot } from './RaccoonMascot'

export function Dashboard() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="user-info">
          <p className="user-name">{user?.user_metadata?.name || 'User'}</p>
          <p className="user-email">{user?.email}</p>
          <p className="user-created">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
        </div>
        <button className="sign-out-icon" onClick={handleSignOut} title="Sign Out">
          ⏻
        </button>
      </div>
      
      {/* Interactive Raccoon Mascot */}
      <RaccoonMascot />
    </div>
  )
}