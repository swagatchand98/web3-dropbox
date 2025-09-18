'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ArrowRight, 
  Play, 
  Menu,
  X
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const blur = useTransform(scrollYProgress, [0, 0.5], [0, 10]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stats = [
    { number: "10K+", label: "Files Stored" },
    { number: "500+", label: "Active Users" },
    { number: "50+", label: "Storage Providers" },
    { number: "99.9%", label: "Uptime" }
  ];

  // Hyperspeed background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Hyperspeed particles
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      prevX: number;
      prevY: number;
      color: string;
    }> = [];

    const colors = ['#d856bf', '#6750a2', '#c247ac', '#03b3c3', '#0e5ea5', '#324555'];
    const numParticles = 200;

    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 1000,
        prevX: 0,
        prevY: 0,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let animationId: number;
    let speed = 2;

    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach((particle) => {
        // Store previous position
        particle.prevX = particle.x;
        particle.prevY = particle.y;

        // Move particle towards camera
        particle.z -= speed;

        // Reset particle if it's too close
        if (particle.z <= 0) {
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
          particle.z = 1000;
        }

        // Calculate 3D to 2D projection
        const scale = 200 / particle.z;
        particle.x = centerX + (particle.x - centerX) * scale;
        particle.y = centerY + (particle.y - centerY) * scale;

        // Draw particle trail
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = scale * 2;
        ctx.globalAlpha = 1 - particle.z / 1000;

        ctx.beginPath();
        ctx.moveTo(particle.prevX, particle.prevY);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, scale * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Hyperspeed Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-lg border-b border-white/10"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold">Web3 Dropbox</span>
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <motion.button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
              className="md:hidden bg-black/40 backdrop-blur-lg border-t border-white/10"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                <button
                  onClick={onGetStarted}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-medium"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section - Full Screen */}
      <section className="min-h-screen flex items-center justify-center pt-20 relative" style={{ zIndex: 10 }}>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Decentralized
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cloud Storage
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Store your files securely on the blockchain. Encrypted, distributed, and owned by you.
              Earn tokens by sharing your storage space.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <motion.button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full text-lg font-semibold flex items-center space-x-2 shadow-2xl"
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Start Storing</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="border border-white/30 px-8 py-4 rounded-full text-lg font-semibold flex items-center space-x-2 backdrop-blur-sm"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                whileHover={{ scale: 1.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-gray-400 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
