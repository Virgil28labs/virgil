import { useState } from 'react'
import { SignUpForm } from './SignUpForm'
import { LoginForm } from './LoginForm'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  const toggleMode = () => {
    setIsLogin(!isLogin)
  }

  return (
    <div className="auth-page">
      <div className="auth-content">
        <header>
          <h1>Virgil</h1>
        </header>
        
        <div className="auth-container">
        <div className="auth-toggle">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>
        
        {isLogin ? <LoginForm /> : <SignUpForm />}
        
        <div className="auth-switch">
          {isLogin ? (
            <p>
              No account?{' '}
              <button onClick={toggleMode} className="link-btn">
                Sign up here
              </button>
            </p>
          ) : (
            <p>
              Have account?{' '}
              <button onClick={toggleMode} className="link-btn">
                Login here
              </button>
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}