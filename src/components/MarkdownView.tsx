import React from 'react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  // Simple & resilient markdown renderer with high visual polish
  const renderFormattedText = (text: string) => {
    // Process bold (**text**), italic (*text*), code (`code`)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="text-slate-800 italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-medium border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-5 list-disc text-slate-700">
            {currentList}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-5 list-decimal text-slate-700">
            {currentList}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={`spacer-${index}`} className="h-2" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4-${index}`}
          className="text-base font-bold text-slate-900 mt-4 mb-2 flex items-center gap-2 border-b border-slate-200 pb-1"
        >
          {trimmed.slice(4)}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${index}`}
          className="text-lg font-bold text-slate-900 mt-5 mb-2.5 pb-1 border-b border-slate-300"
        >
          {trimmed.slice(3)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${index}`}
          className="text-xl font-bold text-slate-950 mt-5 mb-3"
        >
          {trimmed.slice(2)}
        </h2>
      );
      return;
    }

    // Unordered List (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      const rawItem = trimmed.replace(/^[-*]\s+/, '');
      const isScheduleLine = rawItem.includes('⏰') || rawItem.toLowerCase().includes('saran waktu');

      currentList.push(
        <li
          key={`li-${index}`}
          className={`text-sm leading-relaxed ${
            isScheduleLine
              ? 'my-1 py-1 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium list-none -ml-4 flex items-center gap-1.5 shadow-xs'
              : 'text-slate-700'
          }`}
        >
          {renderFormattedText(rawItem)}
        </li>
      );
      return;
    }

    // Ordered list (1. 2. etc.)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(
        <li key={`li-${index}`} className="text-sm leading-relaxed text-slate-800 font-medium my-1">
          {renderFormattedText(olMatch[2])}
        </li>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-4 border-indigo-500 pl-3 py-1 my-2 bg-indigo-50/50 rounded-r text-sm text-slate-800 italic"
        >
          {renderFormattedText(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Standard paragraph
    flushList();
    elements.push(
      <p key={`p-${index}`} className="text-sm leading-relaxed text-slate-700 my-1">
        {renderFormattedText(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1 font-sans">{elements}</div>;
};
