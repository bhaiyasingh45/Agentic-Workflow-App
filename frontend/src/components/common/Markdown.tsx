import { Component, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MarkdownErrorBoundary extends Component<{ children: ReactNode; fallback: string }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <pre className="text-slate-200 whitespace-pre-wrap">{this.props.fallback}</pre>;
    }
    return this.props.children;
  }
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <MarkdownErrorBoundary fallback={content}>
      <div className={`prose prose-invert max-w-none ${className}`}>
        <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-white mb-3 mt-5 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-slate-200 leading-relaxed mb-3 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-3 text-slate-200">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-200">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-slate-200">{children}</li>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-slate-700 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className={`block bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-200 ${className}`} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-x-auto mb-3">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-300 mb-3">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full border-collapse border border-slate-600 rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-700">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-slate-600">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-slate-700/50">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-sm font-semibold text-white border border-slate-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-sm text-slate-200 border border-slate-600">
            {children}
          </td>
        ),
        hr: () => <hr className="border-slate-600 my-4" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-300">{children}</em>
        ),
        }}
      >
        {content}
      </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}
