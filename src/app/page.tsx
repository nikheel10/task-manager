'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  Users,
  Shield,
  ArrowRight,
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Task Management',
    description: 'Create, assign, and track tasks with priority levels, due dates, and status workflows.',
    color: 'bg-blue-500',
  },
  {
    icon: FileText,
    title: 'AMC & Compliance',
    description: 'Automated alerts for Annual Maintenance Contracts and compliance deadlines.',
    color: 'bg-green-500',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'Super Admin, Manager, Team Member, and Viewer roles with granular permissions.',
    color: 'bg-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboard',
    description: 'Visualize task progress, overdue items, team workload, and completion rates.',
    color: 'bg-orange-500',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Email and in-app alerts for assignments, deadlines, verifications, and mentions.',
    color: 'bg-red-500',
  },
  {
    icon: Shield,
    title: 'Verification Workflow',
    description: 'Built-in task verification with approve/reject cycle and audit trail.',
    color: 'bg-indigo-500',
  },
];


const demoAccounts = [
  { role: 'Super Admin', email: 'admin@demo.com', pass: 'Admin@123', color: 'bg-red-100 text-red-700' },
  { role: 'Manager', email: 'manager@demo.com', pass: 'Manager@123', color: 'bg-blue-100 text-blue-700' },
  { role: 'Team Member', email: 'member@demo.com', pass: 'Member@123', color: 'bg-green-100 text-green-700' },
  { role: 'Viewer', email: 'viewer@demo.com', pass: 'Viewer@123', color: 'bg-gray-100 text-gray-700' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">TaskAMC</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Demo
              </Link>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
            <Link href="/login">
              <Button size="sm" className="hidden md:inline-flex">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now with AMC Compliance & Verification Workflows
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
            >
              Task, Project &{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                AMC Compliance
              </span>{' '}
              Management
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            >
              Streamline task assignments, automate compliance tracking, and ensure
              nothing falls through the cracks. Built for teams that ship.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto gap-2" style={{ paddingRight: '1.5rem', paddingLeft: '1.5rem' }}>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Demo Accounts
                </Button>
              </Link>
            </motion.div>
          </div>
          </div>
      </section>

      <section id="features" className="py-20 lg:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to manage work
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed for modern teams handling complex workflows.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full border-border/50 hover:border-primary/50 transition-colors duration-300 bg-background">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <CheckCircle className="w-4 h-4" />
                Built for Compliance Teams
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Never miss a deadline again
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                TaskAMC combines task management with automated compliance tracking.
                Set up AMC contracts once, and get intelligent alerts before renewals,
                inspections, and regulatory deadlines.
              </p>
              <div className="space-y-4">
                {[
                  { icon: CheckCircle, text: 'Automated AMC renewal reminders (30/60/90 days)' },
                  { icon: Clock, text: 'Escalation policies for overdue compliance items' },
                  { icon: Shield, text: 'Audit-ready verification trails with timestamps' },
                  { icon: Users, text: 'Role-based access for auditors and stakeholders' },
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10 rounded-2xl p-8 border border-border/50">
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">AMC Contract Renewal</div>
                        <div className="text-xs text-muted-foreground">Due in 15 days</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Fire Safety Inspection</div>
                        <div className="text-xs text-muted-foreground">Due in 3 days</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Urgent</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">ISO 27001 Audit Prep</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Verified</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">HVAC Maintenance</div>
                        <div className="text-xs text-muted-foreground">Overdue by 2 days</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Overdue</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="demo" className="py-20 lg:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Try it with demo accounts
            </h2>
            <p className="text-lg text-muted-foreground">
              Explore all features with pre-configured roles and sample data.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {demoAccounts.map((account, index) => (
              <motion.div
                key={account.role}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 hover:border-primary/50 transition-colors">
                  <CardHeader className="text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 ${account.color}`}>
                      {account.role}
                    </div>
                    <CardTitle className="text-base">{account.email}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="font-mono text-sm bg-muted px-3 py-2 rounded-lg mb-3">{account.pass}</div>
                    <Link href="/login">
                      <Button className="w-full" variant="outline" size="sm">
                        Sign in as {account.role.split(' ')[0]}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Sign in with a demo account below to explore the platform.
            </p>
            <Link href="/login">
              <Button size="lg" className="gap-2" style={{ paddingRight: '2rem', paddingLeft: '2rem' }}>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">TaskAMC</span>
            </div>
            <p className="text-sm text-muted-foreground">
              TaskAMC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}