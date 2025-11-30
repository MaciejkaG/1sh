import type { MDXComponents } from 'mdx/types';
import { ReactNode } from 'react';

// This file allows you to provide custom React components
// to be used in MDX files. You can import and use any
// React component you want, including inline styles,
// components from other libraries, and more.

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Allows customizing built-in components, e.g. to add styling.
    h1: ({ children }: { children: ReactNode }) => (
      <h1 className="text-4xl font-bold mb-6 text-foreground border-b pb-4">
        {children}
      </h1>
    ),
    h2: ({ children }: { children: ReactNode }) => (
      <h2 className="text-3xl font-semibold mb-4 mt-8 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }: { children: ReactNode }) => (
      <h3 className="text-2xl font-semibold mb-3 mt-6 text-foreground">
        {children}
      </h3>
    ),
    h4: ({ children }: { children: ReactNode }) => (
      <h4 className="text-xl font-semibold mb-2 mt-4 text-foreground">
        {children}
      </h4>
    ),
    p: ({ children }: { children: ReactNode }) => (
      <p className="mb-4 text-muted-foreground leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }: { children: ReactNode }) => (
      <ul className="mb-4 ml-6 list-disc text-muted-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }: { children: ReactNode }) => (
      <ol className="mb-4 ml-6 list-decimal text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }: { children: ReactNode }) => (
      <li className="mb-1">{children}</li>
    ),
    code: ({ children }: { children: ReactNode }) => (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
        {children}
      </code>
    ),
    pre: ({ children }: { children: ReactNode }) => (
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 border">
        {children}
      </pre>
    ),
    blockquote: ({ children }: { children: ReactNode }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic mb-4 text-muted-foreground">
        {children}
      </blockquote>
    ),
    table: ({ children }: { children: ReactNode }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-border">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: { children: ReactNode }) => (
      <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">
        {children}
      </th>
    ),
    td: ({ children }: { children: ReactNode }) => (
      <td className="border border-border px-4 py-2">
        {children}
      </td>
    ),
    a: ({ href, children }: { href?: string; children: ReactNode }) => (
      <a 
        href={href} 
        className="text-primary hover:underline"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    ...components,
  };
}