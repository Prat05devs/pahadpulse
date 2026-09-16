import Link from 'next/link';
import { Database, ExternalLink, HardDrive, Mail, ShieldCheck } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'How Pahad Pulse handles device preferences, operational request data, support emails and third-party map services.',
  path: '/privacy',
  keywords: ['Pahad Pulse privacy policy', 'Pahad Pulse app privacy'],
});

const SUPPORT_EMAIL = 'admin@wtsolutions.cc';

const sections = [
  {
    title: 'Who operates Pahad Pulse',
    body: (
      <>
        Pahad Pulse is built and operated by Team Pahad Pulse, based in Dehradun,
        Uttarakhand, India. Questions about this policy can be sent to the contact address
        below.
      </>
    ),
  },
  {
    title: 'Information you choose to send',
    body: (
      <>
        Pahad Pulse has no account or profile system. If you email support, we receive the
        address you email from and the information you include. Please do not send passwords,
        identity documents, medical records or other sensitive personal information.
      </>
    ),
  },
  {
    title: 'Information stored on your device',
    body: (
      <>
        The mobile app stores your language, appearance setting, followed districts and a
        short-lived cache of previously loaded public data on your device. This supports faster
        return visits and limited-connectivity use. You can clear preferences from Settings;
        uninstalling the app removes its local storage through the operating system.
      </>
    ),
  },
  {
    title: 'Operational request data',
    body: (
      <>
        When the website or app requests public data, our API records a request identifier,
        method, requested path, response status, timestamp and processing duration for security,
        reliability and troubleshooting. Hosting and network providers may also process standard
        connection data such as IP address, browser or device information. We retain operational
        data only as needed for those purposes and according to the configured provider retention
        settings.
      </>
    ),
  },
  {
    title: 'Third-party services and links',
    body: (
      <>
        The website is delivered using Vercel and the public API is hosted on Render. Opening the
        map requests basemap resources from OpenFreeMap and terrain tiles hosted on Amazon Web
        Services. Source links can open government departments or other publishers in your
        browser. Those services receive normal network request information and apply their own
        privacy terms. Pahad Pulse does not send them an account identifier because the app has
        no accounts.
      </>
    ),
  },
  {
    title: 'What we do not do',
    body: (
      <>
        We do not sell personal information, serve behavioural advertising, use a tracking or
        analytics SDK, request precise location, or track people across other companies’ apps and
        websites. Public-data requests are used to provide the screen you opened and operate the
        service.
      </>
    ),
  },
  {
    title: 'Children’s privacy',
    body: (
      <>
        Pahad Pulse is a general-audience public information service and is not designed to
        collect personal information from children. If you believe a child has sent personal
        information through support email, contact us so we can review and delete it where
        appropriate.
      </>
    ),
  },
  {
    title: 'Your choices and requests',
    body: (
      <>
        You can use the service without an account, reset mobile preferences at any time, and
        choose whether to open external source links. To ask about access, correction or deletion
        of information you sent to support, email us using the address below. We may need enough
        information to locate the relevant message and verify the request.
      </>
    ),
  },
  {
    title: 'Changes to this policy',
    body: (
      <>
        We may update this policy when the app, website or service providers change. The effective
        date at the top of this page will be updated when the policy changes materially.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-info-soft text-info">
              <ShieldCheck className="size-6" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Effective 14 September 2026</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-text-light sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Pahad Pulse is a read-only public information service. This policy explains the
              limited information handled when you use the website or mobile app.
            </p>
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:px-8 lg:py-10">
          <article className="space-y-4" aria-label="Privacy policy details">
            {sections.map((section) => (
              <section key={section.title} className="surface-card p-5 sm:p-6">
                <h2 className="font-display text-xl font-semibold tracking-tight text-text-light">
                  {section.title}
                </h2>
                <div className="mt-2 text-base leading-7 text-muted-foreground">{section.body}</div>
              </section>
            ))}
          </article>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="Privacy summary">
            <div className="surface-card p-5">
              <h2 className="font-semibold text-text-light">At a glance</h2>
              <ul className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-3">
                  <HardDrive className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  Preferences and cached public data stay on your device.
                </li>
                <li className="flex gap-3">
                  <Database className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  Operational logs help keep public APIs reliable and secure.
                </li>
                <li className="flex gap-3">
                  <ExternalLink className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  Maps and source links can contact third-party services.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted p-5">
              <Mail className="size-5 text-accent" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-text-light">Privacy questions</h2>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Pahad%20Pulse%20privacy%20question`}
                className="mt-2 inline-block break-all text-sm font-medium text-accent underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                For product help instead, visit the{' '}
                <Link href="/support" className="font-medium text-accent underline underline-offset-4">
                  support page
                </Link>
                .
              </p>
            </div>
            <p className="px-1 text-xs leading-5 text-muted-foreground">
              © 2026 Pahad Pulse. Dehradun, Uttarakhand, India.
            </p>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
