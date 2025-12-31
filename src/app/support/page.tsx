import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Support</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Report a security vulnerability</h2>
          <p className="text-muted-foreground mb-4">
            If you believe you have found a security vulnerability on our platform, please read our{' '}
            <Link href="/security" className="text-primary hover:underline">
              Security Policy
            </Link>
            {' '}for instructions on how to report it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Report a trademark violation</h2>
          <p className="text-muted-foreground mb-4">
            If you believe a package is violating your trademark, please email us at{' '}
            <a href="mailto:trademark@example.com" className="text-primary hover:underline">
              trademark@example.com
            </a>
            {' '}with the details.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Report a package that violates the Code of Conduct</h2>
          <p className="text-muted-foreground mb-4">
            If you believe a package or user is violating our Code of Conduct, please read our{' '}
            <Link href="/code-of-conduct" className="text-primary hover:underline">
              Code of Conduct
            </Link>
            {' '}and email us at{' '}
            <a href="mailto:conduct@example.com" className="text-primary hover:underline">
              conduct@example.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Report a bug in the registry</h2>
          <p className="text-muted-foreground mb-4">
            If you've found a bug in the registry, please search our{' '}
            <a href="https://github.com/modelcontrolinterface/registry/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              issue tracker
            </a>
            {' '}to see if it has already been reported. If not, please open a new issue.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Get help with your account</h2>
          <p className="text-muted-foreground mb-4">
            If you're having trouble with your account, please email us at{' '}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support@example.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact the team for other reasons</h2>
          <p className="text-muted-foreground mb-4">
            For any other issues, please contact us at{' '}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support@example.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
