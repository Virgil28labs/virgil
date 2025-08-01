import React, { useState, memo } from 'react';
import { SignUpForm } from './SignUpForm';
import { LoginForm } from './LoginForm';
import { RaccoonMascot } from './raccoon/RaccoonMascot';
import styles from './AuthPage.module.css';

export const AuthPage = memo(function AuthPage(): React.ReactElement {
  const [isLogin, setIsLogin] = useState<boolean>(true);

  return (
    <div className={styles.authPage}>
      <div className={styles.authContent}>
        <header>
          <h1>Virgil</h1>
        </header>

        <div className={styles.authContainer}>
          <div
            className={styles.authToggle}
            role="tablist"
            aria-label="Authentication mode selection"
          >
            <button
              className={isLogin ? styles.active : ''}
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
              className={!isLogin ? styles.active : ''}
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
            aria-labelledby={isLogin ? 'login-tab' : 'signup-tab'}
          >
            {isLogin ? (
              <LoginForm />
            ) : (
              <SignUpForm />
            )}
          </div>

          <div className={styles.authSwitch}>
            {isLogin ? (
              <p>
                No account?{' '}
                <button onClick={() => setIsLogin(false)} className={styles.linkBtn}>
                  Sign up here
                </button>
              </p>
            ) : (
              <p>
                Have account?{' '}
                <button onClick={() => setIsLogin(true)} className={styles.linkBtn}>
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
  );
});
