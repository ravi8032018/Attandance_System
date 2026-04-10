"use client"
import { useState, useMemo } from 'react';
import React from 'react';
import { ChevronDown, Search, X } from 'lucide-react'; // Optional: Install lucide-react for icons

export function CapitalizeEachWord(sentence) {
  const words = sentence.split(" ");
  const capitalizedWords = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return capitalizedWords.join(" ");
}

async function copyToClipboard(text) {
  // Works on HTTPS and user interaction
  await navigator.clipboard.writeText(text); // throws on failure
}

export function CopyButton({ value, className= '', ariaLabel = 'Copy' }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await copyToClipboard(value);
      setCopied(true);
      // reset after 1.5s
      const t = setTimeout(() => setCopied(false), 1500);
      // cleanup if unmounted early
      return () => clearTimeout(t);
    } catch (e) {
      // optionally show error state
    }
  };

  return (
    <button
      type="button"
      aria-label={`${ariaLabel}`}
      onClick={onCopy}
      className
    >
      {copied ? (
        <span aria-hidden="true">Copied</span>
      ) : (
        // Clipboard SVG icon (hidden from assistive tech)
        <svg viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg" transform="matrix(1, 0, 0, -1, 0, 0)rotate(0)" stroke="#000000" strokeWidth="0.00024000000000000003"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="0.048"></g><g id="SVGRepo_iconCarrier"> <path fillRule="evenodd" clipRule="evenodd" d="M19.5 16.5L19.5 4.5L18.75 3.75H9L8.25 4.5L8.25 7.5L5.25 7.5L4.5 8.25V20.25L5.25 21H15L15.75 20.25V17.25H18.75L19.5 16.5ZM15.75 15.75L15.75 8.25L15 7.5L9.75 7.5V5.25L18 5.25V15.75H15.75ZM6 9L14.25 9L14.25 19.5L6 19.5L6 9Z" fill="#080341"></path> </g></svg>
      )}
    </button>
  );
}

export function SubjectSelect({ 
  allSubjects, 
  allSubjectsLoading, 
  allSubjectsError, 
  facultySelected, 
  assignedCodes, 
  handleSelectChange,
  actionLoadingId 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter(s => 
      (s.subject_name + s.subject_code).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allSubjects, searchTerm]);

  // console.log("Filterred subjects:", filteredSubjects);

  if (allSubjectsLoading) return <p className="text-sm text-slate-400 animate-pulse mt-4">Loading subjects...</p>;
  if (allSubjectsError) return <p className="text-sm text-rose-500 mt-4">{allSubjectsError}</p>;

  return (
    <div className="relative mt-4 w-full ">
      {/* Trigger Button */}
      <button
        onClick={() => facultySelected && setIsOpen(!isOpen)}
        disabled={!facultySelected || allSubjects.length === 0}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-all hover:border-indigo-300 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
      >
        <span className={!facultySelected ? "text-slate-400" : "text-slate-700"}>
          {facultySelected ? "Select a subject..." : "Select faculty first"}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
          
          {/* Search Bar inside dropdown */}
          <div className="relative border-b border-slate-50 p-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full rounded-lg bg-slate-50 py-1.5 pl-8 pr-4 text-sm outline-none placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-100"
              placeholder="Search code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {/* Clear Button */}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredSubjects.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">No matches found</div>
            ) : (
              filteredSubjects.map((subject) => {
                const code = new Set([subject.subject_code]);
                const isAssigned = assignedCodes.has(code);
                const isLoading = actionLoadingId === code;

                return (
                  <button
                    key={code}
                    disabled={isAssigned || isLoading}
                    onClick={() => {
                      handleSelectChange({ target: { value: code } });
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors
                      ${isAssigned 
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400' 
                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}
                    `}
                  >
                    {/* names of the subject and code in a column */}
                    <div className="flex flex-col">
                      <span className="font-medium">{subject.subject_name}</span>
                      <span className="text-xs opacity-70">{code}</span>
                    </div>
                    
                    {isAssigned && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Assigned
                      </span>
                    )}
                    {isLoading && <div className="h-4 w-4 animate-spin border-2 border-indigo-500 border-t-transparent rounded-full" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

