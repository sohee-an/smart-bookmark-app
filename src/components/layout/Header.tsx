import React from 'react';
import { Input } from '../ui/Input';

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Global">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2 group">
            <h1 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 group-hover:opacity-80 transition-opacity">
              SmartMark
            </h1>
          </a>
          
          {/* Search Area - Desktop */}
          <form role="search" className="hidden md:block" onSubmit={(e) => e.preventDefault()}>
            <Input 
              label="북마크 검색"
              icon={<SearchIcon />} 
              placeholder="북마크 검색..." 
              className="w-80"
              type="search"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <PlusIcon />
            <span>북마크 추가</span>
          </button>
        </div>
      </nav>
      
      {/* Search Area - Mobile */}
      <div className="border-t border-zinc-100 p-4 md:hidden dark:border-zinc-800">
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <Input 
            label="북마크 검색"
            icon={<SearchIcon />} 
            placeholder="북마크 검색..." 
            type="search"
          />
        </form>
      </div>
    </header>
  );
};
