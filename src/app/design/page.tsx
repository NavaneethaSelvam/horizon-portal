"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DesignPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers3 aria-hidden="true" className="size-5" /></span>
          <div><p className="text-sm font-bold">Horizon</p><p className="text-xs text-muted">Component library</p></div>
        </div>
        <div className="flex items-center gap-3"><Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-muted hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> Home</Link><ThemeToggle /></div>
      </header>

      <section className="py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Foundation · Task 1</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Horizon design system</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">A practical collection of accessible, reusable interface elements. Switch themes to inspect how the same tokens work in light and dark mode.</p>
      </section>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Buttons</CardTitle><CardDescription>Use clear action hierarchy and consistent interactive states.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary action</Button>
            <Button variant="danger">Delete item</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle><CardDescription>Labels and error text make form fields easier to understand.</CardDescription></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Input label="Full name" placeholder="Enter your name" hint="Use the name you prefer at work." />
            <Input label="Work email" type="email" placeholder="you@company.com" required />
            <Input label="Email with error" type="email" defaultValue="not-an-email" error="Enter a valid email address." />
            <Input label="Disabled field" placeholder="This field is disabled" disabled />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cards</CardTitle><CardDescription>Cards group related information into readable sections.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader><CardTitle>Workspace overview</CardTitle><CardDescription>A calm place to organise your day.</CardDescription></CardHeader>
              <CardContent><p className="text-sm leading-6 text-muted">Consistent spacing and clear hierarchy help people find information quickly.</p></CardContent>
              <CardFooter><Badge variant="success">Ready to use</Badge><span className="text-xs text-muted">Updated just now</span></CardFooter>
            </Card>
            <Card className="shadow-none">
              <CardHeader><CardTitle>Design principle</CardTitle><CardDescription>Reusable by default</CardDescription></CardHeader>
              <CardContent><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Check aria-hidden="true" className="size-4" /></span><p className="text-sm leading-6 text-muted">Shared components make future screens more consistent and easier to maintain.</p></div></CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Badges</CardTitle><CardDescription>Compact labels for statuses and categories.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge><Badge variant="success">Success</Badge><Badge variant="warning">Warning</Badge><Badge variant="danger">Danger</Badge><Badge variant="info">Information</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Interactive example</CardTitle><CardDescription>Try entering an email and submitting the small demo form.</CardDescription></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:max-w-lg sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
              <Input label="Email address" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder="name@example.com" required />
              <Button type="submit">Test input</Button>
            </form>
            {submitted ? <p role="status" className="mt-3 text-sm font-medium text-success">Input accepted for this local UI demo: {email}</p> : null}
          </CardContent>
        </Card>
      </div>

      <footer className="mt-10 border-t border-border py-6 text-xs text-muted">Horizon Portal · Design showcase · Task 1 only</footer>
    </main>
  );
}
