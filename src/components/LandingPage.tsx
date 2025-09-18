'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ArrowRight, 
  Play, 
  Menu,
  X
} from 'lucide-react';
import Hyperspeed from './Hyperspeed';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stats = [
    { number: "10K+", label: "Files Stored" },
    { number: "500+", label: "Active Users" },
    { number: "50+", label: "Storage Providers" },
    { number: "99.9%", label: "Uptime" }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Hyperspeed Background */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
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
            speedUp: 1.5,
            fov: 90,
            fovSpeedUp: 120
          }}
        />
      </div>

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" style={{ zIndex: 2 }}></div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 bg-black/10 backdrop-blur-md border-b border-purple-500/20"
        style={{ zIndex: 50 }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Web3 Dropbox
              </span>
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <motion.button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-purple-500 to-cyan-400 px-8 py-3 rounded-full font-semibold text-white shadow-lg shadow-purple-500/25 border border-purple-400/30"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(168, 85, 247, 0.4)",
                  borderColor: "rgba(168, 85, 247, 0.6)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black/60 backdrop-blur-lg border-t border-purple-500/20"
            >
              <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
                <button
                  onClick={() => {
                    onGetStarted();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 px-6 py-3 rounded-full font-semibold text-white"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section - Full Screen */}
      <section className="min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 relative" style={{ zIndex: 10 }}>
        <div className="container mx-auto text-center relative z-10 max-w-6xl">
          {/* Floating particles effect - Reduced for mobile */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full opacity-40 sm:opacity-60"
                animate={{
                  x: [0, 80, -40, 0],
                  y: [0, -80, 40, 0],
                  scale: [1, 1.3, 0.8, 1],
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  left: `${25 + i * 20}%`,
                  top: `${35 + i * 10}%`,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black mb-6 sm:mb-8 leading-tight px-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
                Decentralized
              </span>
              <br />
              <motion.span 
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: "200% 200%" }}
              >
                Cloud Storage
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-base sm:text-md md:text-lg lg:text-xl text-gray-200 mb-8 sm:mb-12 max-w-md md:max-w-4xl mx-auto leading-relaxed font-light px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              Store your files securely on the blockchain. 
              <span className="text-purple-300 font-medium"> Encrypted, distributed, and owned by you.</span>
              <br className="hidden sm:block" />
              <span className="block sm:inline mt-2 sm:mt-0">Earn tokens by sharing your storage space in the decentralized future.</span>
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12 sm:mb-16 px-4"
          >
            <motion.button
              onClick={onGetStarted}
              className="group relative bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 px-6 sm:px-8 lg:px-10 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold flex items-center space-x-2 sm:space-x-3 shadow-2xl shadow-purple-500/30 border border-purple-400/30 overflow-hidden w-full sm:w-auto max-w-xs sm:max-w-none"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 25px 50px rgba(168, 85, 247, 0.5)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10">Start Storing</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            
            <motion.button
              className="group border-2 border-purple-400/40 px-6 sm:px-8 lg:px-10 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-semibold flex items-center space-x-2 sm:space-x-3 backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300 w-full sm:w-auto max-w-xs sm:max-w-none"
              whileHover={{ 
                scale: 1.05,
                borderColor: "rgba(168, 85, 247, 0.8)",
                backgroundColor: "rgba(255, 255, 255, 0.1)"
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
              <span>Watch Demo</span>
            </motion.button>
          </motion.div>

          {/* Enhanced Stats - Mobile Optimized */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300"
                whileHover={{ 
                  scale: 1.05,
                  y: -5,
                  boxShadow: "0 20px 40px rgba(168, 85, 247, 0.2)"
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-1 sm:mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                  {stat.number}
                </div>
                <div className="text-gray-300 text-xs sm:text-sm md:text-base font-medium uppercase tracking-wider leading-tight">
                  {stat.label}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
