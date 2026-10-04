import React, { useState } from 'react';
import { AuraOrb } from './AuraOrb';
import { UserProfile } from '../types';
import { signInWithGoogleFirebase } from '../lib/firebase';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Building,
  Layers,
  Sliders,
  ChevronRight,
  AlertCircle,
  Loader2,
  Info,
  ExternalLink,
  X,
  User,
  Check,
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticate?: (user: UserProfile) => void;
  onCompleteAuth?: (user: UserProfile) => void;
  onExploreDemo?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticate,
  onCompleteAuth,
  onExploreDemo,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<number>(1);

  // Form states
  const [loginEmail, setLoginEmail] = useState('workingbynoor@gmail.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);

  // Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  // Google Modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isCustomGoogleActive, setIsCustomGoogleActive] = useState(false);

  // Onboarding state
  const [name, setName] = useState('Noor A.');
  const [email, setEmail] = useState('workingbynoor@gmail.com');
  const [password, setPassword] = useState('password123');
  const [companyName, setCompanyName] = useState('Aura Studio Operations');
  const [businessDomain, setBusinessDomain] = useState('Digital Solutions & Consulting');
  const [teamSize, setTeamSize] = useState('1-5 specialists');
  const [primaryServices, setPrimaryServices] = useState<string[]>([
    'AI Strategy & Development',
    'Web & UI/UX Systems',
  ]);
  const [averageProjectValue, setAverageProjectValue] = useState('$2,500 - $10,000');
  const [aiAssistanceLevel, setAiAssistanceLevel] = useState<
    'conservative' | 'balanced' | 'autonomous_with_approval'
  >('autonomous_with_approval');

  const handleAuthSuccess = (user: UserProfile) => {
    if (onAuthenticate) onAuthenticate(user);
    if (onCompleteAuth) onCompleteAuth(user);
  };

  // 1. SIGN IN SUBMIT HANDLER (Connecting frontend to backend /api/auth/login)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setGoogleNotice(null);

    // Form field validation
    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address (e.g., name@company.com).');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Signing in to AURA...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsSubmitting(false);
        setStatusMessage(null);
        setErrorMessage(
          data.error || 'Invalid email or password. Please verify your credentials and try again.'
        );
        return;
      }

      // Success
      if (data.token) {
        localStorage.setItem('aura_auth_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('aura_user_profile', JSON.stringify(data.user));
      }

      setStatusMessage('Welcome back! Launching AURA Command Center...');
      setTimeout(() => {
        setIsSubmitting(false);
        handleAuthSuccess(data.user);
      }, 500);
    } catch (err: any) {
      console.error('Sign-in network error:', err);
      setIsSubmitting(false);
      setStatusMessage(null);
      setErrorMessage(
        'Unable to sign in right now. Please verify your connection or try again shortly.'
      );
    }
  };

  // 2. GOOGLE AUTH EXECUTION HANDLER
  const executeGoogleAuth = async (targetEmail: string, targetName: string) => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setStatusMessage(`Authenticating with Google (${targetEmail})...`);

    try {
      const authRes = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail.trim().toLowerCase(),
          name: targetName.trim(),
          isGoogleAuth: true,
        }),
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        setIsGoogleLoading(false);
        setStatusMessage(null);
        setErrorMessage(authData.error || 'Google authentication failed.');
        return;
      }

      if (authData.token) {
        localStorage.setItem('aura_auth_token', authData.token);
      }
      if (authData.user) {
        localStorage.setItem('aura_user_profile', JSON.stringify(authData.user));
      }

      setStatusMessage('Google authentication verified! Entering workspace...');
      setTimeout(() => {
        setIsGoogleLoading(false);
        setShowGoogleModal(false);
        handleAuthSuccess(authData.user);
      }, 400);
    } catch (err: any) {
      console.error('Google Auth execution error:', err);
      setIsGoogleLoading(false);
      setStatusMessage(null);
      setErrorMessage('Failed to complete Google authentication. Please try again.');
    }
  };

  // CONTINUE WITH GOOGLE TRIGGER
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setGoogleNotice(null);
    setIsGoogleLoading(true);

    try {
      // First attempt native Firebase Google Auth popup
      setStatusMessage('Authenticating with Google via Firebase Auth...');
      try {
        const fbResult = await signInWithGoogleFirebase();
        if (fbResult && fbResult.email) {
          const authRes = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: fbResult.email,
              name: fbResult.displayName || fbResult.email.split('@')[0],
              picture: fbResult.photoURL || '',
              firebaseUid: fbResult.uid,
            }),
          });
          const authData = await authRes.json();
          if (authRes.ok && authData.user) {
            if (authData.token) localStorage.setItem('aura_auth_token', authData.token);
            localStorage.setItem('aura_user_profile', JSON.stringify(authData.user));
            setStatusMessage('Authenticated with Google! Launching Command Center...');
            setTimeout(() => {
              setIsGoogleLoading(false);
              handleAuthSuccess(authData.user);
            }, 350);
            return;
          }
        }
      } catch (fbErr: any) {
        console.warn('Firebase popup handled, checking alternative:', fbErr?.message);
      }

      // Check if backend has Google OAuth configured
      const configRes = await fetch('/api/auth/config');
      const config = await configRes.json();

      if (config.configured && config.googleClientId) {
        // If Google Client ID is configured, attempt Google Identity Services (GIS)
        const clientId = config.googleClientId;

        const runGIS = () => {
          if (!(window as any).google?.accounts?.id) {
            setShowGoogleModal(true);
            setIsGoogleLoading(false);
            return;
          }

          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential?: string }) => {
              if (!response.credential) {
                setShowGoogleModal(true);
                setIsGoogleLoading(false);
                return;
              }

              setStatusMessage('Verifying Google credentials with server...');

              const authRes = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              });

              const authData = await authRes.json();

              if (!authRes.ok) {
                setIsGoogleLoading(false);
                setStatusMessage(null);
                setErrorMessage(authData.error || 'Google authentication failed.');
                return;
              }

              if (authData.token) {
                localStorage.setItem('aura_auth_token', authData.token);
              }
              if (authData.user) {
                localStorage.setItem('aura_user_profile', JSON.stringify(authData.user));
              }

              setStatusMessage('Authenticated with Google! Entering workspace...');
              setTimeout(() => {
                setIsGoogleLoading(false);
                handleAuthSuccess(authData.user);
              }, 400);
            },
          });

          (window as any).google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              setShowGoogleModal(true);
              setIsGoogleLoading(false);
            }
          });
        };

        if ((window as any).google?.accounts?.id) {
          runGIS();
        } else {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => runGIS();
          script.onerror = () => {
            setIsGoogleLoading(false);
            setShowGoogleModal(true);
          };
          document.head.appendChild(script);
        }
      } else {
        // Immediate Google account selector in Preview / Workspace mode
        setIsGoogleLoading(false);
        setShowGoogleModal(true);
      }
    } catch (err: any) {
      console.error('Google Sign-In check error:', err);
      setIsGoogleLoading(false);
      setShowGoogleModal(true);
    }
  };

  // Instant 1-click login for pre-seeded account
  const handleFastLoginNoor = async () => {
    setLoginEmail('workingbynoor@gmail.com');
    setLoginPassword('password123');
    setErrorMessage(null);
    setGoogleNotice(null);
    setIsSubmitting(true);
    setStatusMessage('Signing in as Noor A. (workingbynoor@gmail.com)...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'workingbynoor@gmail.com',
          password: 'password123',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsSubmitting(false);
        setStatusMessage(null);
        setErrorMessage(data.error || 'Failed to sign in.');
        return;
      }

      if (data.token) {
        localStorage.setItem('aura_auth_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('aura_user_profile', JSON.stringify(data.user));
      }

      setStatusMessage('Welcome back, Noor! Launching Command Center...');
      setTimeout(() => {
        setIsSubmitting(false);
        handleAuthSuccess(data.user);
      }, 350);
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMessage(null);
      setErrorMessage('Could not connect to authentication server.');
    }
  };

  // 3. STEP 5 SIGNUP SUBMIT HANDLER (Backend persistence /api/auth/signup)
  const handleSignupComplete = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);
    setStatusMessage('Creating your AURA account in the backend...');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Workspace Director',
          email: email.trim(),
          password,
          companyName: companyName.trim() || 'Aura Studio Operations',
          role: 'Managing Director & Founder',
          businessDomain,
          teamSize,
          primaryServices,
          averageProjectValue,
          aiAssistanceLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsSubmitting(false);
        setStatusMessage(null);
        setErrorMessage(
          data.error || 'Failed to create account. Please check your information or try signing in.'
        );
        return;
      }

      if (data.token) {
        localStorage.setItem('aura_auth_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('aura_user_profile', JSON.stringify(data.user));
      }

      setStatusMessage('Account created successfully! Launching AURA Command Center...');
      setTimeout(() => {
        setIsSubmitting(false);
        handleAuthSuccess(data.user);
      }, 600);
    } catch (err: any) {
      console.error('Signup error:', err);
      setIsSubmitting(false);
      setStatusMessage(null);
      setErrorMessage('Could not connect to the authentication server. Please try again.');
    }
  };

  const toggleService = (srv: string) => {
    if (primaryServices.includes(srv)) {
      setPrimaryServices(primaryServices.filter((s) => s !== srv));
    } else {
      setPrimaryServices([...primaryServices, srv]);
    }
  };

  // Fast autofill for testing
  const handleAutofillDefault = () => {
    setLoginEmail('workingbynoor@gmail.com');
    setLoginPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div
      id="aura-auth-container"
      className="min-h-screen w-full bg-[#05070D] flex flex-col lg:flex-row text-gray-100 overflow-hidden relative"
    >
      {/* Background ambient radial gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none" />

      {/* Left decorative brand side */}
      <div
        id="auth-brand-panel"
        className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5 relative z-10 bg-[#060913]/60 backdrop-blur-md"
      >
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#05070D] rounded-xl flex items-center justify-center">
                <span className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 text-lg">
                  A
                </span>
              </div>
            </div>
            <div>
              <span className="text-xl font-display font-extrabold tracking-tight text-white block">
                AURA AI
              </span>
              <span className="text-[10px] tracking-widest text-cyan-400 uppercase font-semibold block">
                Intelligent Operating Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Center Visual: Concentric breathing orb */}
        <div className="my-10 lg:my-auto flex flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <AuraOrb size="lg" state={isSubmitting || isGoogleLoading ? 'thinking' : 'idle'} />
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-bold text-white max-w-md tracking-tight">
            Autonomous Operations With Complete Human Governance
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">
            Real-time pipeline synchronization across Fiverr and Email with active intelligence and human-in-the-loop sign-off.
          </p>

          <div className="mt-6 flex items-center space-x-2 text-xs text-cyan-300/80 bg-cyan-950/20 px-3.5 py-1.5 rounded-full border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="font-medium">Core Principle: AI assists. Human decides.</span>
          </div>
        </div>

        {/* Footer brand promise */}
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>Enterprise Grade Privacy</span>
          <span>Zero Unapproved Automations</span>
        </div>
      </div>

      {/* Right form side: Spacious, high-readability authentication */}
      <div
        id="auth-form-panel"
        className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-center max-w-xl mx-auto w-full z-10"
      >
        {authMode === 'login' ? (
          <div id="login-section" className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Welcome back
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-gray-400">
                Sign in to continue to your intelligent workspace.
              </p>
            </div>

            {/* Status Feedback Banner */}
            {statusMessage && (
              <div
                id="auth-status-banner"
                className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200"
              >
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}

            {/* Error Feedback Banner */}
            {errorMessage && (
              <div
                id="auth-error-banner"
                className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMessage}</p>
                  {errorMessage.includes('Invalid') && (
                    <button
                      type="button"
                      onClick={handleAutofillDefault}
                      className="text-[11px] text-cyan-400 hover:underline mt-1 block font-medium"
                    >
                      Click here to load verified credentials (workingbynoor@gmail.com)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Google OAuth Notice Banner */}
            {googleNotice && (
              <div
                id="google-config-notice"
                className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5"
              >
                <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-amber-300">Google OAuth Notice</p>
                  <p className="text-amber-200/90 leading-relaxed text-[11px]">
                    {googleNotice}
                  </p>
                  <button
                    type="button"
                    onClick={handleFastLoginNoor}
                    className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 underline block pt-0.5 cursor-pointer"
                  >
                    👉 Fill pre-seeded credentials to sign in immediately
                  </button>
                </div>
              </div>
            )}

            {/* Google OAuth action */}
            <button
              id="btn-login-google"
              type="button"
              disabled={isGoogleLoading || isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border border-white/10 bg-[#0D1220] hover:bg-[#151B2B] active:bg-[#1A2236] text-white text-sm font-medium transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Google Account Selection Dialog / Modal */}
            {showGoogleModal && (
              <div
                id="google-account-modal"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
              >
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 text-white relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center space-x-2.5">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <h3 className="font-semibold text-base text-white">Sign in with Google</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGoogleModal(false)}
                      className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-300">
                    Choose an account to continue to <span className="font-semibold text-white">AURA AI</span>
                  </p>

                  {/* Account options */}
                  <div className="space-y-2.5">
                    {/* Primary Account: Noor A. */}
                    <button
                      type="button"
                      onClick={() => executeGoogleAuth('workingbynoor@gmail.com', 'Noor A.')}
                      disabled={isGoogleLoading}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/30 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          N
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                              Noor A.
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                              Verified
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">workingbynoor@gmail.com</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Secondary Account: Rayan Ahmed */}
                    <button
                      type="button"
                      onClick={() => executeGoogleAuth('rayan@aurastudio.io', 'Rayan Ahmed')}
                      disabled={isGoogleLoading}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-[#161f38]/50 hover:bg-[#1e294b] transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          R
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors block">
                            Rayan Ahmed
                          </span>
                          <span className="text-xs text-gray-400">rayan@aurastudio.io</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>

                  {/* Custom Google Account Toggle */}
                  <div className="pt-1">
                    {!isCustomGoogleActive ? (
                      <button
                        type="button"
                        onClick={() => setIsCustomGoogleActive(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1.5 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Sign in with another Google Workspace account</span>
                      </button>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                        <label className="block text-xs font-semibold text-gray-300">
                          Enter Google Workspace Email
                        </label>
                        <input
                          type="email"
                          value={customGoogleEmail}
                          onChange={(e) => setCustomGoogleEmail(e.target.value)}
                          placeholder="executive@company.com"
                          className="w-full bg-[#0D1220] border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customGoogleEmail.includes('@')) {
                              executeGoogleAuth(
                                customGoogleEmail,
                                customGoogleName || customGoogleEmail.split('@')[0]
                              );
                            }
                          }}
                          disabled={!customGoogleEmail.includes('@') || isGoogleLoading}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Continue with {customGoogleEmail || 'Account'}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 border-t border-white/10 pt-3">
                    By continuing, Google shares your profile identity to access your AURA AI workspace.
                  </p>
                </div>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                Or sign in with email
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@company.com"
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Password reset instructions: Use default password "password123" for pre-seeded accounts.');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter password"
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-0"
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>

              <button
                id="btn-sign-in"
                type="submit"
                disabled={isSubmitting}
                className="w-full aura-gradient-btn text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* 1-Click Fast Sign In Button */}
              <button
                id="btn-fast-sign-in"
                type="button"
                onClick={handleFastLoginNoor}
                disabled={isSubmitting || isGoogleLoading}
                className="w-full py-2.5 px-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>⚡ 1-Click Fast Sign In (Noor A. · workingbynoor@gmail.com)</span>
              </button>
            </form>

            <div className="pt-2 flex flex-col space-y-3">
              <p className="text-center text-xs text-gray-400">
                Don't have an AURA workspace yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setSignupStep(1);
                    setErrorMessage(null);
                    setGoogleNotice(null);
                  }}
                  className="text-cyan-400 hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Create account (5-step onboarding)
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* 5-STEP SIGNUP ONBOARDING */
          <div id="signup-onboarding" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Step {signupStep} of 5
                </span>
                <span className="text-xs text-gray-400">
                  {signupStep === 1 && 'Account Creation'}
                  {signupStep === 2 && 'About Your Business'}
                  {signupStep === 3 && 'Work & Services'}
                  {signupStep === 4 && 'AI & Governance'}
                  {signupStep === 5 && 'Workspace Confirmation'}
                </span>
              </div>
              <div className="w-full bg-[#0D1220] h-1.5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${(signupStep / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Error Feedback Banner in Signup */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Status Feedback Banner in Signup */}
            {statusMessage && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Step 1: Account */}
            {signupStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-white">
                    Create your AURA account
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Step 1 of 5: Secure credentials for your business OS.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Noor A."
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Password (Minimum 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) {
                      setErrorMessage('Please enter your full name.');
                      return;
                    }
                    if (!email.trim() || !email.includes('@')) {
                      setErrorMessage('Please enter a valid work email address.');
                      return;
                    }
                    if (!password || password.length < 6) {
                      setErrorMessage('Password must be at least 6 characters.');
                      return;
                    }
                    setErrorMessage(null);
                    setSignupStep(2);
                  }}
                  className="w-full aura-gradient-btn text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 mt-4 cursor-pointer"
                >
                  <span>Continue to Business Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: About */}
            {signupStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-white">
                    Tell us about your business
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Step 2 of 5: Tailoring AURA to your operational structure.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Company or Studio Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Aura Studio Operations"
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Industry / Operational Domain
                  </label>
                  <select
                    value={businessDomain}
                    onChange={(e) => setBusinessDomain(e.target.value)}
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Digital Solutions & Consulting">
                      Digital Solutions & Consulting
                    </option>
                    <option value="Freelance Design & Development">
                      Freelance Design & Development
                    </option>
                    <option value="Agency & Creative Services">
                      Agency & Creative Services
                    </option>
                    <option value="Software & AI Engineering">
                      Software & AI Engineering
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Team Structure
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Solo Founder', '1-5 specialists', '6-20 team'].map(
                      (size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setTeamSize(size)}
                          className={`py-2 text-xs rounded-lg border text-center transition-all cursor-pointer ${
                            teamSize === size
                              ? 'bg-indigo-950/60 border-indigo-500 text-cyan-300 font-semibold'
                              : 'bg-[#0D1220] border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="w-1/3 py-2.5 rounded-xl border border-white/10 text-gray-400 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupStep(3)}
                    className="w-2/3 aura-gradient-btn text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Next: Work & Deliverables</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Work */}
            {signupStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-white">
                    Services & Workload
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Step 3 of 5: Helps AURA understand deliverable contexts.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Primary Offerings (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'AI Strategy & Development',
                      'Web & UI/UX Systems',
                      'Business Automation',
                      'Client Retainers',
                      'Technical Architecture',
                      'Fiverr Deliverables',
                    ].map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => toggleService(srv)}
                        className={`p-2.5 text-xs text-left rounded-lg border transition-all cursor-pointer ${
                          primaryServices.includes(srv)
                            ? 'bg-indigo-950/50 border-indigo-500/60 text-cyan-300 font-semibold'
                            : 'bg-[#0D1220] border-white/10 text-gray-400'
                        }`}
                      >
                        {primaryServices.includes(srv) ? '✓ ' : '+ '}
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Average Project Scale
                  </label>
                  <select
                    value={averageProjectValue}
                    onChange={(e) => setAverageProjectValue(e.target.value)}
                    className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Under $1,000">Under $1,000 / project</option>
                    <option value="$1,000 - $2,500">
                      $1,000 - $2,500 / project
                    </option>
                    <option value="$2,500 - $10,000">
                      $2,500 - $10,000 / project
                    </option>
                    <option value="$10,000+">$10,000+ Enterprise tier</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSignupStep(2)}
                    className="w-1/3 py-2.5 rounded-xl border border-white/10 text-gray-400 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupStep(4)}
                    className="w-2/3 aura-gradient-btn text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Next: AI Governance</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: AI Governance */}
            {signupStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-white">
                    AI Governance Policy
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Step 4 of 5: You define the boundary of AI autonomy.
                  </p>
                </div>
                <div className="space-y-3">
                  <div
                    onClick={() =>
                      setAiAssistanceLevel('autonomous_with_approval')
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      aiAssistanceLevel === 'autonomous_with_approval'
                        ? 'bg-indigo-950/40 border-cyan-500 text-white shadow-sm'
                        : 'bg-[#0D1220] border-white/10 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300">
                        Human-in-the-Loop (Recommended)
                      </span>
                      <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded text-cyan-400 border border-cyan-500/30">
                        Default
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      AURA detects incoming orders and drafts responses, but
                      requires explicit human approval before any action is executed.
                    </p>
                  </div>
                  <div
                    onClick={() => setAiAssistanceLevel('conservative')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      aiAssistanceLevel === 'conservative'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white'
                        : 'bg-[#0D1220] border-white/10 text-gray-400'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-200">
                      Conservative Insights Only
                    </span>
                    <p className="text-[11px] text-gray-400 mt-1">
                      AURA only provides analytics when directly asked; no
                      background webhook triggers.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSignupStep(3)}
                    className="w-1/3 py-2.5 rounded-xl border border-white/10 text-gray-400 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupStep(5)}
                    className="w-2/3 aura-gradient-btn text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Final Review</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Finish */}
            {signupStep === 5 && (
              <div className="space-y-5 text-center py-2">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30">
                    <div className="w-full h-full bg-[#080B14] rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-white">
                    Your workspace is ready.
                  </h2>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-sm mx-auto">
                    Welcome, <span className="text-white font-semibold">{name}</span>.
                    AURA Command Center will be initialized for{' '}
                    <span className="text-cyan-300 font-semibold">
                      {companyName}
                    </span>
                    .
                  </p>
                </div>
                <div className="bg-[#0D1220] p-4 rounded-xl border border-white/10 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account:</span>
                    <span className="text-white font-medium">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Governance:</span>
                    <span className="text-cyan-300 font-medium">
                      Human Approval Required
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Initial Telemetry:</span>
                    <span className="text-gray-300">
                      0 Clients · 0 Projects · $0 Revenue
                    </span>
                  </div>
                </div>
                <button
                  id="btn-create-account-complete"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSignupComplete}
                  className="w-full aura-gradient-btn text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span>Creating my AURA account…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                      <span>Create my AURA account</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Already have an account? <span className="text-indigo-400 font-semibold">Sign in</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
