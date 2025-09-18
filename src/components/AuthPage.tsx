'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Shield,
  Github,
  Chrome,
  Twitter,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import Hyperspeed from './Hyperspeed';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });

  // If user is already authenticated, don't show auth page
  if (user && !loading) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (!isLogin) {
      if (!formData.displayName) {
        setError('Display name is required');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }

    return true;
  };

  const { 
    signInWithEmail, 
    signInWithGoogle, 
    signInWithGitHub, 
    signInWithTwitter, 
    createAccountWithEmail 
  } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmail(formData.email, formData.password);
      } else {
        await createAccountWithEmail(
          formData.email, 
          formData.password, 
          formData.displayName
        );
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github' | 'twitter') => {
    setIsLoading(true);
    setError('');

    try {
      switch (provider) {
        case 'google':
          await signInWithGoogle();
          break;
        case 'github':
          await signInWithGitHub();
          break;
        case 'twitter':
          await signInWithTwitter();
          break;
      }
    } catch (error: any) {
      console.error('Social auth error:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center relative overflow-hidden">
        {/* Hyperspeed Background */}
        <div className="absolute inset-0 w-full h-full min-h-screen">
          <Hyperspeed
            effectOptions={{
              colors: {
                roadColor: 0x080808,
                islandColor: 0x0a0a0a,
                background: 0x000000,
                shoulderLines: 0x131318,
                brokenLines: 0x131318,
                leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
                rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
                sticks: 0x03b3c3
              },
              distortion: 'turbulentDistortion',
              speedUp: 1,
              fov: 90,
              fovSpeedUp: 120
            }}
          />
        </div>
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">Initializing Web3 Dropbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Hyperspeed Background */}
      <div className="absolute inset-0 w-full h-full min-h-screen">
        <Hyperspeed
          effectOptions={{
            colors: {
              roadColor: 0x080808,
              islandColor: 0x0a0a0a,
              background: 0x000000,
              shoulderLines: 0x131318,
              brokenLines: 0x131318,
              leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
              rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
              sticks: 0x03b3c3
            },
            distortion: 'turbulentDistortion',
            speedUp: 1,
            fov: 90,
            fovSpeedUp: 120
          }}
        />
      </div>

      {/* Overlay for better readability */}
      <div className="absolute inset-0 w-full h-full min-h-screen bg-gradient-to-b from-black/40 via-transparent to-black/60" style={{ zIndex: 2 }}></div>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="w-20 h-20 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/25"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1 
            className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Web3 Dropbox
          </motion.h1>
          <motion.p 
            className="text-gray-300 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {isLogin ? (
              <>Welcome back to the <span className="text-purple-400 font-semibold">future</span>!</>
            ) : (
              <>Join the <span className="text-cyan-400 font-semibold">decentralized</span> revolution</>
            )}
          </motion.p>
        </motion.div>

        {/* Auth Form */}
        <motion.div 
          className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 p-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Toggle Login/Register */}
          <div className="flex mb-8 bg-white/5 rounded-xl p-1">
            <motion.button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 text-center font-semibold rounded-lg transition-all duration-300 ${
                isLogin
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-400 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Sign In
            </motion.button>
            <motion.button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 text-center font-semibold rounded-lg transition-all duration-300 ${
                !isLogin
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-400 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Sign Up
            </motion.button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <span className="text-red-200 text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-6 mb-8">
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your name"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-4 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
                      placeholder="Confirm your password"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/30 border border-purple-400/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:shadow-purple-500/50"
              whileHover={{ scale: 1.02, boxShadow: "0 25px 50px rgba(168, 85, 247, 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {isLogin ? 'Access Web3 Dropbox' : 'Create Account'}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-500/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-r from-black via-purple-900/50 to-black text-gray-300">Or continue with</span>
            </div>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-4">
            <motion.button
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-4 border border-purple-500/30 rounded-xl shadow-lg bg-white/5 text-white font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 backdrop-blur-sm transition-all duration-300"
              whileHover={{ scale: 1.02, borderColor: "rgba(168, 85, 247, 0.6)" }}
              whileTap={{ scale: 0.98 }}
            >
              <Chrome className="w-5 h-5 mr-3 text-cyan-400" />
              Continue with Google
            </motion.button>

            <motion.button
              onClick={() => handleSocialAuth('github')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-4 border border-purple-500/30 rounded-xl shadow-lg bg-white/5 text-white font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 backdrop-blur-sm transition-all duration-300"
              whileHover={{ scale: 1.02, borderColor: "rgba(168, 85, 247, 0.6)" }}
              whileTap={{ scale: 0.98 }}
            >
              <Github className="w-5 h-5 mr-3 text-purple-400" />
              Continue with GitHub
            </motion.button>

            <motion.button
              onClick={() => handleSocialAuth('twitter')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-4 border border-purple-500/30 rounded-xl shadow-lg bg-white/5 text-white font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 backdrop-blur-sm transition-all duration-300"
              whileHover={{ scale: 1.02, borderColor: "rgba(168, 85, 247, 0.6)" }}
              whileTap={{ scale: 0.98 }}
            >
              <Twitter className="w-5 h-5 mr-3 text-cyan-400" />
              Continue with Twitter
            </motion.button>
          </div>

          {/* Terms */}
          <p className="mt-8 text-xs text-gray-400 text-center">
            By signing {isLogin ? 'in' : 'up'}, you agree to our{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
              Privacy Policy
            </a>
          </p>
        </motion.div>

        {/* Features */}
        <motion.div 
          className="mt-8 grid grid-cols-1 gap-4 text-sm"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.div 
            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm p-6 rounded-xl border border-green-500/20 flex items-center"
            whileHover={{ scale: 1.02, borderColor: "rgba(34, 197, 94, 0.4)" }}
          >
            <Shield className="w-6 h-6 text-green-400 mr-4" />
            <div>
              <div className="font-semibold text-white">End-to-End Encrypted</div>
              <div className="text-gray-300">Your files are encrypted before upload</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 flex items-center"
            whileHover={{ scale: 1.02, borderColor: "rgba(59, 130, 246, 0.4)" }}
          >
            <User className="w-6 h-6 text-blue-400 mr-4" />
            <div>
              <div className="font-semibold text-white">5GB Free Storage</div>
              <div className="text-gray-300">Start with generous free tier</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
