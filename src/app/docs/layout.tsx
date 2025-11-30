import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Code, Zap } from 'lucide-react';

interface DocsLayoutProps {
  children: ReactNode;
}

const navigation = [
  {
    title: 'Getting Started',
    href: '/docs',
    icon: Book,
  },
  {
    title: 'API Reference',
    href: '/docs/api',
    icon: Code,
  },
  {
    title: 'Interactive Examples',
    href: '/docs/examples',
    icon: Zap,
  },
  {
    title: 'Integration Guide',
    href: '/docs/integration',
    icon: Code,
  },
];

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to 1sh</span>
              </Link>
              <div className="h-4 w-px bg-border" />
              <h1 className="text-xl font-semibold">API Documentation</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-8">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}