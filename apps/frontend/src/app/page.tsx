'use client';

import { motion, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Mail,
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Building2,
  MessageSquare,
  Zap,
  Target,
  TrendingUp,
  Clock,
  Star,
  Rocket,
  Lock,
  Search,
  BarChart3,
  Globe,
  UserCheck,
  Send,
  Tag,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef, useEffect } from 'react';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Spotlight effect - mouse position tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const spotlightY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Create dynamic gradient background that follows cursor
  const spotlightBackground = useMotionTemplate`radial-gradient(600px circle at ${spotlightX}px ${spotlightY}px, rgba(59, 130, 246, 0.15), transparent 40%)`;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div ref={containerRef} className="min-h-screen bg-black relative overflow-hidden">
      {/* Consistent background - pure black */}
      <div className="fixed inset-0 -z-20 bg-black"></div>

      {/* Spotlight effect - follows mouse */}
      <motion.div
        className="pointer-events-none fixed inset-0 -z-15 opacity-40"
        style={{
          background: spotlightBackground
        }}
      />

      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl border-b border-white/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-md"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-2.5 rounded-xl">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
              EventPlanner
            </span>
          </motion.div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="sm" className="text-white hover:text-blue-400 hover:bg-white/5 text-sm sm:text-base border border-white/10">
                  Login
                </Button>
              </motion.div>
            </Link>
            <Link href="/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 hover:from-blue-700 hover:via-blue-800 hover:to-cyan-700 text-white text-sm sm:text-base">
                  <span className="relative z-10">Get Started</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 rounded-md blur-lg opacity-50"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20">
        <motion.div
          style={{ y, opacity }}
          className="max-w-7xl mx-auto w-full"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column */}
            <div className="text-left space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/20 text-blue-300 mb-6"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  <span className="text-sm font-medium">AI-Powered Event Management Platform</span>
                </motion.div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-[1.1]">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="block bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent"
                  >
                    Events That
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="block mt-2"
                  >
                    <span className="relative inline-block">
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 blur-2xl opacity-50"
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                        }}
                      />
                      <span className="relative bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                        Inspire
                      </span>
                    </span>
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="text-xl sm:text-2xl text-gray-400 max-w-xl leading-relaxed"
                >
                  Create unforgettable experiences with intelligent event management. From invitation to celebration.
                </motion.p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <Link href="/signup">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 text-white px-10 py-7 text-lg font-semibold group overflow-hidden">
                      <span className="relative z-10 flex items-center gap-2">
                        Start Free Today
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="h-5 w-5" />
                        </motion.div>
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.5 }}
                      />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/login">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" variant="outline" className="border-2 border-blue-400 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200 px-10 py-7 text-lg backdrop-blur-xl">
                      View Demo
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              {/* Animated Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="relative group"
                  >
                    <motion.div
                      className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="relative">
                      <div className={`text-3xl sm:text-4xl font-bold ${stat.gradient} bg-clip-text text-transparent`}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right Column - Animated Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative perspective-1000">
                {/* Main Dashboard Card */}
                <motion.div
                  className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl"
                  whileHover={{ scale: 1.02, rotateY: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Calendar className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <div className="text-white font-semibold text-lg">Tech Summit 2024</div>
                        <div className="text-gray-400 text-sm">Enterprise Event</div>
                      </div>
                    </div>
                    <motion.div
                      className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-green-400 text-sm font-medium">● Live</span>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {mockupStats.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      >
                        <div className={`${item.iconBg} rounded-xl p-2 w-fit mb-3`}>
                          {item.icon}
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{item.value}</div>
                        <div className="text-sm text-gray-400">{item.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-300">Attendance Rate</span>
                        <span className="text-blue-400 font-semibold">94%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: '94%' }}
                          transition={{ duration: 1.5, delay: 1 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-300">Engagement</span>
                        <span className="text-cyan-400 font-semibold">87%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: '87%' }}
                          transition={{ duration: 1.5, delay: 1.2 }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Icons */}
                <FloatingIcon
                  icon={<Zap className="h-6 w-6 text-white" />}
                  className="absolute -top-8 -right-8 bg-gradient-to-br from-blue-500 to-cyan-500"
                  delay={0.5}
                />
                <FloatingIcon
                  icon={<Target className="h-6 w-6 text-white" />}
                  className="absolute -bottom-8 -left-8 bg-gradient-to-br from-cyan-500 to-blue-600"
                  delay={0.7}
                />
                <FloatingIcon
                  icon={<Rocket className="h-5 w-5 text-white" />}
                  className="absolute top-1/2 -right-12 bg-gradient-to-br from-blue-600 to-cyan-600"
                  delay={0.9}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Core Features Grid - Enhanced */}
      <section className="relative py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6"
            >
              ✨ Powerful Features
            </motion.div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Everything You Need,
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                All in One Place
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Complete event management solution with 18+ enterprise features
            </p>
          </motion.div>

          {/* Main Features - Large Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {mainFeatures.map((feature, index) => (
              <MainFeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>

          {/* Secondary Features - Smaller Grid */}
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {secondaryFeatures.map((feature, index) => (
              <SecondaryFeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Process Section */}
      <section className="relative py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Simple Yet Powerful
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Get started in minutes, scale to thousands of events
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {process.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                {/* Connection line */}
                {index < process.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-cyan-500/50 -z-10" />
                )}

                <motion.div
                  whileHover={{ y: -10 }}
                  className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-blue-500/50 transition-all"
                >
                  {/* Step number */}
                  <motion.div
                    className="absolute -top-4 -left-4 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/50"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {index + 1}
                  </motion.div>

                  <div className={`${step.gradient} rounded-2xl p-4 w-fit mb-6 mt-4`}>
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Access Section */}
      <section className="relative py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 opacity-50"
              animate={{
                background: [
                  'linear-gradient(0deg, #3b82f6, #06b6d4)',
                  'linear-gradient(180deg, #06b6d4, #0ea5e9)',
                  'linear-gradient(360deg, #0ea5e9, #3b82f6)',
                ],
              }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="absolute inset-[2px] bg-black/80 backdrop-blur-2xl rounded-3xl" />

            <div className="relative p-8 sm:p-16">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white"
                  >
                    Built for Teams of All Sizes
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-gray-300 mb-8"
                  >
                    From solo organizers to enterprise teams, our flexible role system ensures everyone has the right permissions and capabilities.
                  </motion.p>
                  <div className="space-y-4">
                    {roles.map((role, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-4 group cursor-pointer bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div className={`${role.gradient} rounded-xl p-2.5`}>
                          {role.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">{role.title}</h3>
                          <p className="text-gray-400 text-sm">{role.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {roleFeatures.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 backdrop-blur-xl hover:border-white/40 transition-all cursor-pointer group"
                    >
                      <motion.div
                        className={`${item.gradient} rounded-xl p-3 w-fit mb-4`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        {item.icon}
                      </motion.div>
                      <h3 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                      <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{item.stat}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Massive glowing gradient */}
            <motion.div
              className="absolute -inset-40 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 rounded-full blur-[100px] opacity-30"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
              }}
            />

            <div className="relative bg-black/60 rounded-3xl p-12 sm:p-20 border border-white/20 backdrop-blur-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
                  <Star className="h-4 w-4 fill-current" />
                  <span>Join thousands of event organizers</span>
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 text-white"
              >
                Ready to Start?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto"
              >
                Create your first event in minutes. No credit card required.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/signup">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="relative bg-white text-blue-600 hover:bg-gray-100 px-12 py-8 text-xl font-bold shadow-2xl group">
                      <span className="relative z-10 flex items-center gap-3">
                        Get Started Free
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="h-6 w-6" />
                        </motion.div>
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-md blur-xl opacity-0 group-hover:opacity-50"
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                      />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/login">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" variant="outline" className="border-2 border-blue-400 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200 px-12 py-8 text-xl font-bold backdrop-blur-xl">
                      Sign In
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-md"></div>
                <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-xl">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                EventPlanner
              </span>
            </motion.div>
            <p className="text-gray-400">© 2024 EventPlanner. Transforming events worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Floating Icon Component
function FloatingIcon({ icon, className, delay = 0 }: { icon: React.ReactNode; className: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className={`rounded-2xl p-4 shadow-2xl ${className}`}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      >
        {icon}
      </motion.div>
    </motion.div>
  );
}

// Main Feature Card Component
function MainFeatureCard({ feature, index }: { feature: typeof mainFeatures[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="relative group"
    >
      <motion.div
        className={`absolute -inset-[1px] ${feature.gradient} rounded-3xl blur-md opacity-0 group-hover:opacity-75 transition-opacity`}
      />

      <div className="relative h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-10 border border-white/10 group-hover:border-white/20 transition-all">
        <div className="flex items-start gap-6">
          <motion.div
            className={`${feature.gradient} rounded-2xl p-5 flex-shrink-0`}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            {feature.icon}
          </motion.div>
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
              {feature.title}
            </h3>
            <p className="text-gray-400 leading-relaxed text-lg mb-4">
              {feature.description}
            </p>
            <ul className="space-y-2">
              {feature.highlights.map((highlight, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Secondary Feature Card Component
function SecondaryFeatureCard({ feature, index }: { feature: typeof secondaryFeatures[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.03 }}
      className="relative group"
    >
      <div className="relative h-full bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-2xl p-6 border border-white/10 group-hover:border-blue-500/50 transition-all">
        <motion.div
          className={`${feature.gradient} rounded-xl p-3 w-fit mb-4`}
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
        >
          {feature.icon}
        </motion.div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {feature.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

const stats = [
  { value: '100%', label: 'Free Forever', gradient: 'bg-gradient-to-r from-blue-400 to-cyan-400' },
  { value: '24/7', label: 'AI Support', gradient: 'bg-gradient-to-r from-cyan-400 to-blue-500' },
  { value: '∞', label: 'Events', gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
];

const mockupStats = [
  {
    icon: <Users className="h-5 w-5 text-white" />,
    value: '847',
    label: 'Attendees',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-white" />,
    value: '94%',
    label: 'Confirmed',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
  },
  {
    icon: <Clock className="h-5 w-5 text-white" />,
    value: '2 Days',
    label: 'Until Event',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-white" />,
    value: '+23%',
    label: 'Growth',
    iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
  },
];

const mainFeatures = [
  {
    icon: <Calendar className="h-10 w-10 text-white" />,
    title: "Smart Event Management",
    description: "Complete event lifecycle management with intelligent tools and automation.",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    highlights: [
      "7 event categories (Conference, Meetup, Workshop, Social, Networking, Webinar, Other)",
      "Public & private event visibility control",
      "Advanced search with filters by date, category, and location",
      "Real-time attendance tracking with RSVP counts"
    ]
  },
  {
    icon: <Users className="h-10 w-10 text-white" />,
    title: "Guest & RSVP System",
    description: "Professional guest management with automated invitations and real-time tracking.",
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-600",
    highlights: [
      "External guest invitations via email",
      "One-click RSVP with accept/decline tracking",
      "Automated email notifications with SendGrid",
      "Live attendance dashboard for organizers"
    ]
  },
  {
    icon: <Shield className="h-10 w-10 text-white" />,
    title: "Enterprise Security & Roles",
    description: "Flexible role-based access control with 4 distinct permission levels.",
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
    highlights: [
      "Admin: Full platform control & user management",
      "Organizer: Create events, manage team, send invitations",
      "Team Member: View organization events & collaborate",
      "Guest: Public event access with RSVP capability"
    ]
  },
  {
    icon: <Building2 className="h-10 w-10 text-white" />,
    title: "Organization Management",
    description: "Multi-organization support with team collaboration and member invitations.",
    gradient: "bg-gradient-to-br from-orange-500 to-red-500",
    highlights: [
      "Unlimited organizations per user",
      "Team member invitations with 7-day expiry",
      "Organizer approval workflow for upgrades",
      "Organization details with member statistics"
    ]
  },
];

const secondaryFeatures = [
  {
    icon: <MessageSquare className="h-6 w-6 text-white" />,
    title: "AI Chat Assistant",
    description: "Get instant help with event planning powered by advanced AI",
    gradient: "bg-gradient-to-br from-blue-600 to-cyan-600"
  },
  {
    icon: <Mail className="h-6 w-6 text-white" />,
    title: "Email Notifications",
    description: "Automated emails for invites, RSVPs, and event updates",
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-500"
  },
  {
    icon: <Search className="h-6 w-6 text-white" />,
    title: "Advanced Search",
    description: "Find events quickly with powerful filters and search",
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-500"
  },
  {
    icon: <Tag className="h-6 w-6 text-white" />,
    title: "Event Categories",
    description: "Organize with 7 pre-defined event categories",
    gradient: "bg-gradient-to-br from-yellow-500 to-orange-500"
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-white" />,
    title: "Analytics Dashboard",
    description: "Real-time stats for admins and organizers",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    icon: <Lock className="h-6 w-6 text-white" />,
    title: "Password Reset",
    description: "Secure password recovery via email verification",
    gradient: "bg-gradient-to-br from-cyan-600 to-blue-700"
  },
  {
    icon: <UserCheck className="h-6 w-6 text-white" />,
    title: "JWT Authentication",
    description: "Secure token-based authentication system",
    gradient: "bg-gradient-to-br from-green-500 to-teal-500"
  },
  {
    icon: <Eye className="h-6 w-6 text-white" />,
    title: "Visibility Control",
    description: "Public or private events with access management",
    gradient: "bg-gradient-to-br from-blue-500 to-indigo-500"
  },
];

const process = [
  {
    icon: <UserCheck className="h-10 w-10 text-white" />,
    title: "Sign Up & Create Org",
    description: "Create your free account and set up your organization in seconds. Choose your role and invite team members.",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    icon: <Calendar className="h-10 w-10 text-white" />,
    title: "Create Your Event",
    description: "Design your event with categories, visibility settings, and custom details. Invite guests with one click.",
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-600"
  },
  {
    icon: <BarChart3 className="h-10 w-10 text-white" />,
    title: "Track & Manage",
    description: "Monitor RSVPs in real-time, send notifications, and manage attendance with comprehensive analytics.",
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500"
  },
];

const roles = [
  {
    icon: <Shield className="h-5 w-5 text-white" />,
    title: "Admin",
    description: "Full platform access, user management, organization oversight, and system configuration.",
    gradient: "bg-gradient-to-br from-blue-600 to-cyan-600"
  },
  {
    icon: <Star className="h-5 w-5 text-white" />,
    title: "Organizer",
    description: "Create & manage events, invite team members, send invitations, and track attendance.",
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-600"
  },
  {
    icon: <Users className="h-5 w-5 text-white" />,
    title: "Team Member",
    description: "View organization events, collaborate with team, and access member features.",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    icon: <Globe className="h-5 w-5 text-white" />,
    title: "Guest",
    description: "Browse public events, RSVP to invitations, and request organizer upgrade.",
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500"
  },
];

const roleFeatures = [
  {
    icon: <Shield className="h-6 w-6 text-white" />,
    title: "User Roles",
    stat: "4 Types",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    icon: <Building2 className="h-6 w-6 text-white" />,
    title: "Organizations",
    stat: "Unlimited",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    icon: <Send className="h-6 w-6 text-white" />,
    title: "Invitations",
    stat: "7 Day Expiry",
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500"
  },
  {
    icon: <Lock className="h-6 w-6 text-white" />,
    title: "Security",
    stat: "JWT Auth",
    gradient: "bg-gradient-to-br from-yellow-500 to-orange-500"
  },
];
