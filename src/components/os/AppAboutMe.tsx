import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { GraduationCap, FolderOpen, Workflow, Mail, Github, Linkedin, ExternalLink } from 'lucide-react';

/* ─── Simple reveal wrapper ─── */
const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Data ─── */
const projects = [
  {
    name: 'CtxNote',
    subdomain: 'cn.akib.qzz.io',
    desc: 'A Visual Knowledge Base & Infinite Canvas. Create, connect, and organize notes visually. Supports offline access as a PWA.',
    color: '#60a5fa',
    colorRgb: '96, 165, 250',
    tags: ['React', 'PWA', 'Canvas'],
  },
  {
    name: 'RT - Routine Tracker',
    subdomain: 'rt.akib.qzz.io',
    desc: 'Premium Routine Tracking for peak performance. AI-powered task management, goal tracking, and daily motivation.',
    color: '#34d399',
    colorRgb: '52, 211, 153',
    tags: ['AI', 'Productivity', 'Mobile'],
  },
  {
    name: 'Hisabkhata',
    subdomain: 'hk.akib.qzz.io',
    desc: 'Credit & Loan Tracker to manage who owes you money and who you owe. Simplifying personal and business finances.',
    color: '#fbbf24',
    colorRgb: '251, 191, 36',
    tags: ['Finance', 'Tracker', 'Web'],
  },
];

const processSteps = [
  { num: '01', title: 'Research & Wireframes', desc: 'Understanding requirements and sketching low-fidelity wireframes to map out user flow and information architecture.' },
  { num: '02', title: 'High-Fidelity Mockups', desc: 'Translating wireframes into pixel-perfect designs with typography systems, color palettes, and component libraries.' },
  { num: '03', title: 'Micro-Interactions', desc: 'Adding purposeful animations and transitions that elevate the experience through precision and intricate detail.' },
];

const contactLinks = [
  { icon: Mail, label: 'Email', href: 'mailto:mm.adnanakib@gmail.com', color: '#f87171', colorRgb: '248, 113, 113' },
  { icon: Github, label: 'GitHub', href: 'https://github.com/akibcse24', color: '#e2e8f0', colorRgb: '226, 232, 240' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/in/adnan-akib-6b361a3ba', color: '#60a5fa', colorRgb: '96, 165, 250' },
];

/* ─── Section Heading ─── */
const SectionHeading = ({ icon: Icon, label, color }: { icon: typeof GraduationCap; label: string; color: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center"
      style={{ background: `rgba(${color}, 0.12)` }}
    >
      <Icon size={14} style={{ color: `rgb(${color})` }} />
    </div>
    <h2 className="text-sm font-heading font-semibold text-os-window-body-foreground tracking-tight">{label}</h2>
    <div className="flex-1 h-px" style={{ background: `rgba(${color}, 0.15)` }} />
  </div>
);

/* ─── Main Component ─── */
const AppAboutMe = () => {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-os-window-body">
      {/* ═══ HERO ═══ */}
      <div
        className="relative px-6 py-12 flex flex-col items-center text-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(220, 20%, 10%) 0%, hsl(220, 20%, 12%) 100%)',
          borderBottom: '1px solid hsl(220, 15%, 18%)',
        }}
      >
        {/* Subtle glow behind avatar */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsla(260, 70%, 55%, 0.12), transparent 70%)',
            filter: 'blur(30px)',
          }}
        />

        {/* Avatar */}
        <motion.div
          className="relative z-10 mb-5"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="absolute inset-[-6px] rounded-full border-2"
            style={{ borderColor: 'hsla(260, 70%, 60%, 0.25)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="w-20 h-20 rounded-full overflow-hidden"
            style={{
              boxShadow: '0 4px 24px hsla(260, 70%, 50%, 0.3)',
            }}
          >
            <img
              src="/me.png"
              alt="Adnan Akib"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Name */}
        <motion.h1
          className="relative z-10 text-2xl font-heading font-bold text-os-window-body-foreground mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Adnan Akib
        </motion.h1>

        {/* Subtitle */}
        <motion.div
          className="relative z-10 flex items-center gap-2 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div className="w-5 h-px bg-os-window-body-foreground/15" />
          <p className="text-xs font-heading text-os-window-body-foreground/60 tracking-wider uppercase">
            CSE, KUET
          </p>
          <div className="w-5 h-px bg-os-window-body-foreground/15" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="relative z-10 text-[11px] text-os-window-body-foreground/40 max-w-xs leading-relaxed italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Crafting visually striking interfaces with precision and purpose
        </motion.p>

        {/* Animated gradient line at bottom */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px animate-gradient-text"
          style={{
            width: '60%',
            background: 'linear-gradient(90deg, transparent, hsl(260, 70%, 60%), hsl(217, 91%, 60%), hsl(190, 80%, 55%), transparent)',
            backgroundSize: '200% 100%',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        />
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-5 py-6 space-y-6">

        {/* ── ABOUT ── */}
        <Reveal>
          <SectionHeading icon={GraduationCap} label="About" color="167, 139, 250" />
          <div className="space-y-2.5">
            {/* Academic */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'hsl(220, 18%, 14%)',
                border: '1px solid hsl(220, 15%, 20%)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-4 rounded-full bg-violet-400" />
                <span className="text-xs font-heading font-medium text-os-window-body-foreground">Academic Background</span>
              </div>
              <p className="text-[11px] text-os-window-body-foreground/60 leading-relaxed pl-3">
                Computer Science & Engineering at KUET, Batch 2k24. Exploring the intersection of technology and design to build meaningful digital experiences.
              </p>
            </div>
            {/* Philosophy */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'hsl(220, 18%, 14%)',
                border: '1px solid hsl(220, 15%, 20%)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-4 rounded-full bg-violet-400" />
                <span className="text-xs font-heading font-medium text-os-window-body-foreground">Design Philosophy</span>
              </div>
              <p className="text-[11px] text-os-window-body-foreground/60 leading-relaxed pl-3">
                Minimalist layouts, vibrant typography, depth through lighting. Precision and intricate details define the visual identity.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── PROJECTS ── */}
        <Reveal delay={0.05}>
          <SectionHeading icon={FolderOpen} label="Projects" color="96, 165, 250" />
          <div className="space-y-2.5">
            {projects.map((p, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div
                  className="rounded-xl p-4 relative overflow-hidden group"
                  style={{
                    background: 'hsl(220, 18%, 14%)',
                    border: '1px solid hsl(220, 15%, 20%)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `rgba(${p.colorRgb}, 0.3)`;
                    e.currentTarget.style.boxShadow = `0 0 20px rgba(${p.colorRgb}, 0.08)`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'hsl(220, 15%, 20%)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{ background: p.color }}
                  />

                  <div className="pl-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: p.color, boxShadow: `0 0 6px rgba(${p.colorRgb}, 0.5)` }}
                        />
                        <span className="text-xs font-heading font-semibold text-os-window-body-foreground">{p.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-os-window-body-foreground/30">{p.subdomain}</span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-os-window-body-foreground/50 leading-relaxed mb-2.5">
                      {p.desc}
                    </p>

                    {/* Tags */}
                    <div className="flex gap-1.5">
                      {p.tags.map((tag, j) => (
                        <span
                          key={j}
                          className="text-[9px] px-2 py-0.5 rounded-md font-medium"
                          style={{
                            background: `rgba(${p.colorRgb}, 0.1)`,
                            color: `rgba(${p.colorRgb}, 0.85)`,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* ── PROCESS ── */}
        <Reveal delay={0.05}>
          <SectionHeading icon={Workflow} label="Process" color="52, 211, 153" />
          <div
            className="rounded-xl p-4"
            style={{
              background: 'hsl(220, 18%, 14%)',
              border: '1px solid hsl(220, 15%, 20%)',
            }}
          >
            <div className="relative">
              {processSteps.map((step, i) => (
                <Reveal key={i} delay={0.1 + i * 0.1}>
                  <div className="flex gap-3 relative">
                    {/* Step number */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-heading font-bold shrink-0"
                        style={{
                          background: 'hsl(220, 15%, 18%)',
                          border: '2px solid hsl(160, 50%, 40%)',
                          color: 'hsl(160, 60%, 55%)',
                        }}
                      >
                        {step.num}
                      </div>
                      {i < processSteps.length - 1 && (
                        <div className="w-px flex-1 my-1" style={{ background: 'hsl(220, 15%, 20%)' }} />
                      )}
                    </div>
                    {/* Text */}
                    <div className="pb-5">
                      <div className="text-xs font-heading font-semibold text-os-window-body-foreground mb-0.5">{step.title}</div>
                      <div className="text-[11px] text-os-window-body-foreground/50 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── CONTACT ── */}
        <Reveal delay={0.05}>
          <SectionHeading icon={Mail} label="Contact" color="248, 113, 113" />
          <div
            className="rounded-xl p-3 space-y-1.5"
            style={{
              background: 'hsl(220, 18%, 14%)',
              border: '1px solid hsl(220, 15%, 20%)',
            }}
          >
            {contactLinks.map((link, i) => {
              const Icon = link.icon;
              return (
                <Reveal key={i} delay={i * 0.06}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-lg group"
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'hsl(220, 15%, 18%)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `rgba(${link.colorRgb}, 0.1)`,
                        color: link.color,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-heading font-medium text-os-window-body-foreground">{link.label}</div>
                      <div className="text-[10px] font-mono text-os-window-body-foreground/35 truncate">
                        {link.href.replace(/^(mailto:|https?:\/\/)/, '')}
                      </div>
                    </div>
                    <ExternalLink size={12} className="text-os-window-body-foreground/15 group-hover:text-os-window-body-foreground/40 transition-colors" />
                  </a>
                </Reveal>
              );
            })}
          </div>
        </Reveal>

        {/* Footer */}
        <Reveal>
          <div className="pt-4 pb-8 text-center">
            <p className="text-[9px] font-heading text-os-window-body-foreground/15 tracking-[0.15em] uppercase">
              Designed with precision
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default AppAboutMe;
