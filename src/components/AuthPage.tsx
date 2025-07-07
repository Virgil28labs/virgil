import { useState, memo } from 'react'
import { SignUpForm } from './SignUpForm'
import { LoginForm } from './LoginForm'
import { RaccoonMascot } from './RaccoonMascot'

export const AuthPage = memo(function AuthPage(): JSX.Element {
  const [isLogin, setIsLogin] = useState<boolean>(true)

  return (
    <div className="auth-page">
      <div className="auth-content">
        <header>
          <h1>Virgil</h1>
        </header>
        
        <div className="auth-container">
        <div 
          className="auth-toggle" 
          role="tablist" 
          aria-label="Authentication mode selection"
        >
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
            role="tab"
            aria-selected={isLogin}
            aria-controls="auth-form-panel"
            aria-label="Switch to login form"
            id="login-tab"
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
            role="tab"
            aria-selected={!isLogin}
            aria-controls="auth-form-panel"
            aria-label="Switch to sign up form"
            id="signup-tab"
          >
            Sign Up
          </button>
        </div>
        
        <div 
          id="auth-form-panel"
          role="tabpanel"
          aria-labelledby={isLogin ? "login-tab" : "signup-tab"}
        >
          {isLogin ? (
            <LoginForm />
          ) : (
            <SignUpForm />
          )}
        </div>
        
        <div className="auth-switch">
          {isLogin ? (
            <p>
              No account?{' '}
              <button onClick={() => setIsLogin(false)} className="link-btn">
                Sign up here
              </button>
            </p>
          ) : (
            <p>
              Have account?{' '}
              <button onClick={() => setIsLogin(true)} className="link-btn">
                Login here
              </button>
            </p>
          )}
        </div>
        </div>
      </div>
      
      {/* Interactive Raccoon Mascot */}
      <RaccoonMascot />
    </div>
  )
})