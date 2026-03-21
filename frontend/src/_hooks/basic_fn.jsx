"use client"
// import { useState } from 'react';
import React from 'react';
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



