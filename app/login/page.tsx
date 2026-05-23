"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";

// Animated background particles with connections
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const count = 80;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let animationId: number;

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      
      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx!.beginPath();
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - distance / 150)})`;
            ctx!.stroke();
          }
        });
      });

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${p.alpha})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, ${p.alpha * 0.5})`);
        ctx!.fillStyle = gradient;
        ctx!.fill();
      });
      animationId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert("Password reset functionality coming soon!");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 selection:bg-indigo-500/30">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      
      {/* Moving gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-violet-500/30 rounded-full blur-[120px] animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse delay-500" />
      
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Particles */}
      <Particles />

      <main className="relative z-10 w-full max-w-md px-4">
        {/* Animated entrance */}
        <div
          className={`
            transform transition-all duration-1000 ease-out
            ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}
          `}
        >
          {/* Logo section */}
          <div className="text-center mb-10">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-3xl blur-2xl opacity-60 animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-indigo-200 to-violet-200 bg-clip-text text-transparent tracking-tight">
              Telegram Admin
            </h1>
            <p className="text-slate-400 text-sm mt-3 font-medium">
              Welcome back! Sign in to continue
            </p>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Animated border glow */}
            <div className="absolute -inset-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-3xl opacity-30 blur-lg animate-pulse" style={{ animationDuration: '3s' }} />
            
            <div className="relative bg-slate-950/90 backdrop-blur-2xl rounded-3xl border border-slate-800/50 p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl p-4 text-center animate-in slide-in-from-top-2 duration-300 flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2.5">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-all duration-300" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@telegram.dev"
                      autoComplete="email"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-white/[0.02] border border-slate-700/50 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-b-2xl" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between ml-1">
                    <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Password
                    </label>
                    <button type="button" onClick={handleForgotPassword} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-200 font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-all duration-300" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-12 pr-12 py-4 bg-white/[0.02] border border-slate-700/50 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-b-2xl" />
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="relative w-full h-14 rounded-2xl overflow-hidden group mt-4 font-semibold text-base"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 group-hover:from-indigo-500 group-hover:via-violet-500 group-hover:to-indigo-500 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="absolute inset-0 shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2)]" />
                  
                  <span className="relative flex items-center justify-center gap-2 text-white">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </span>
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950 px-4 text-slate-500 font-medium tracking-wider">Admin Credentials</span>
                </div>
              </div>

              {/* Admin credentials */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-4 bg-white/[0.02] border border-slate-800/50 rounded-2xl px-6 py-4 hover:bg-white/[0.04] transition-colors duration-300">
                  <div className="flex flex-col items-start text-xs">
                    <span className="text-slate-500 font-medium uppercase tracking-wider">Email</span>
                    <span className="text-slate-200 font-mono text-sm mt-1">demo@telegram.dev</span>
                  </div>
                  <div className="w-px h-10 bg-slate-800/50" />
                  <div className="flex flex-col items-start text-xs">
                    <span className="text-slate-500 font-medium uppercase tracking-wider">Password</span>
                    <span className="text-slate-200 font-mono text-sm mt-1">demo123</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-800" />
                <p className="text-center text-xs text-slate-600 font-medium">
                  <Shield className="w-3 h-3 inline mr-1" />
                  Secure connection
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}