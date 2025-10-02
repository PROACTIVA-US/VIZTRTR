import React, { useState, KeyboardEvent } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  disabled = false,
  placeholder = 'Enter your prompt here...'
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await onSubmit(prompt);
      setPrompt('');
    } catch (error) {
      console.error('Error submitting prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setPrompt('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="w-full min-h-[120px] p-4 text-base resize-none border-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-500"
            rows={4}
          />
          
          {prompt && (
            <button
              onClick={handleClear}
              disabled={disabled || isLoading}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded disabled:opacity-50"
              aria-label="Clear prompt"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Press Enter to submit, Shift+Enter for new line</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={!prompt || disabled || isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || disabled || isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400 text-center">
        {prompt.length}/2000 characters
      </div>
    </div>
  );
};