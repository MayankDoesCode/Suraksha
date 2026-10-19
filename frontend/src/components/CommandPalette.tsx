import React from 'react';
import { CornerDownLeft, Moon, Search, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { NAV_ITEMS } from './navigation';

interface Command {
  id: string;
  section: 'Go to' | 'Findings' | 'Actions';
  label: string;
  hint?: string;
  run: () => void;
}

const SEV_DOT: Record<string, string> = { Critical: 'bg-danger', High: 'bg-high', Medium: 'bg-warn', Low: 'bg-ok' };

export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { candidates, setActiveTab, setFocusedFindingId } = useApp();
  const { resolved, setPreference } = useTheme();
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commands = React.useMemo<Command[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Command[] = NAV_ITEMS.filter((n) => !q || `${n.label} ${n.keywords || ''}`.toLowerCase().includes(q)).map((n) => ({
      id: `page:${n.id}`, section: 'Go to', label: n.label, hint: n.group || undefined, run: () => setActiveTab(n.id),
    }));
    const findings: Command[] = candidates
      .filter((c) => !q || `${c.title} ${c.identifier}`.toLowerCase().includes(q))
      .slice(0, q ? 8 : 4)
      .map((c) => ({
        id: `finding:${c.id}`, section: 'Findings', label: c.title, hint: `${c.riskCategory} · ${c.identifier}`,
        run: () => { setFocusedFindingId(c.id); setActiveTab('investigation-center'); },
      }));
    const actions: Command[] = [{
      id: 'theme', section: 'Actions', label: `Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`,
      run: () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
    }].filter((a) => !q || a.label.toLowerCase().includes(q) || 'theme appearance'.includes(q));
    return [...pages, ...findings, ...actions];
  }, [query, candidates, resolved, setActiveTab, setFocusedFindingId, setPreference]);

  React.useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  const run = (c?: Command) => { if (!c) return; onClose(); c.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(commands.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(commands[index]); }
  };

  let lastSection = '';
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="sk-rise relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-dropdown">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 text-fgSubtle" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Go to a page or find a finding…"
            aria-label="Search commands and findings"
            aria-controls="cmd-list"
            aria-activedescendant={commands[index] ? `cmd-${commands[index].id}` : undefined}
            className="w-full bg-transparent py-3 text-sm placeholder:text-fgSubtle focus:outline-none"
          />
          <kbd className="rounded border border-line px-1.5 text-[10px] text-fgSubtle">Esc</kbd>
        </div>
        <ul id="cmd-list" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {commands.length === 0 && <li className="px-3 py-6 text-center text-sm text-fgMuted">Nothing matches “{query}”.</li>}
          {commands.map((c, i) => {
            const header = c.section !== lastSection;
            lastSection = c.section;
            const finding = c.id.startsWith('finding:') ? candidates.find((x) => `finding:${x.id}` === c.id) : undefined;
            return (
              <React.Fragment key={c.id}>
                {header && <li role="presentation" className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-fgSubtle">{c.section}</li>}
                <li
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === index}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => run(c)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] ${i === index ? 'bg-surface3 text-fg' : 'text-fgMuted'}`}
                >
                  {finding && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEV_DOT[finding.riskCategory] || 'bg-fgSubtle'}`} aria-hidden />}
                  {c.id === 'theme' && (resolved === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />)}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="max-w-[45%] truncate font-mono text-[11px] text-fgSubtle">{c.hint}</span>}
                  {i === index && <CornerDownLeft className="h-3 w-3 text-fgSubtle" aria-hidden />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
