import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'https://vercel-deply1-ftiz1zuy0-meignanamsrinivasans-projects.vercel.app/api' || 'http://localhost:8000/api';

function App() {
  const [prompt, setPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [script, setScript] = useState('');
  const [options, setOptions] = useState({
    duration: '',
    language: '',
    platform: '',
    size: '',
    category: ''
  });
  const [loading, setLoading] = useState({
    extract: false,
    enhance: false,
    generate: false
  });
  const [error, setError] = useState('');

  // Extract Options
  const handleExtract = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading({ ...loading, extract: true });
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/extract-options`, { prompt });
      setOptions(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Extraction failed');
    } finally {
      setLoading({ ...loading, extract: false });
    }
  };

  // Enhance Prompt
  const handleEnhance = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading({ ...loading, enhance: true });
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/enhance-prompt`, {
        prompt,
        options
      });
      setEnhancedPrompt(res.data.enhanced_prompt);
    } catch (err) {
      setError(err.response?.data?.error || 'Enhancement failed');
    } finally {
      setLoading({ ...loading, enhance: false });
    }
  };

  // Generate Script
  const handleGenerate = async () => {
    const promptToUse = enhancedPrompt || prompt;
    
    if (!promptToUse.trim()) {
      setError('Please enter or enhance a prompt first');
      return;
    }

    setLoading({ ...loading, generate: true });
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/generate-script`, {
        prompt: promptToUse
      });
      setScript(res.data.script);
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading({ ...loading, generate: false });
    }
  };

  // Update option field
  const updateOption = (field, value) => {
    setOptions({ ...options, [field]: value });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎬 Cinematic Script Generator</h1>
        <p>Turn your ideas into professional video scripts</p>
      </header>

      <main className="container">
        {/* Prompt Input */}
        <div className="card">
          <label className="label">Your Prompt</label>
          <textarea
            className="textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a 30 second kids educational video about cleanliness for YouTube in English, vertical format."
            rows="4"
          />
          
          <div className="button-group">
            <button 
              onClick={handleExtract}
              disabled={loading.extract}
              className="btn btn-primary"
            >
              {loading.extract ? '...' : '🔍 Extract'}
            </button>
            <button 
              onClick={handleEnhance}
              disabled={loading.enhance}
              className="btn btn-secondary"
            >
              {loading.enhance ? '...' : '✨ Enhance'}
            </button>
            <button 
              onClick={handleGenerate}
              disabled={loading.generate}
              className="btn btn-success"
            >
              {loading.generate ? '...' : '🎬 Generate'}
            </button>
          </div>
        </div>

        {/* Enhanced Prompt (shows only if enhanced) */}
        {enhancedPrompt && (
          <div className="card">
            <label className="label">Enhanced Prompt (editable)</label>
            <textarea
              className="textarea"
              value={enhancedPrompt}
              onChange={(e) => setEnhancedPrompt(e.target.value)}
              rows="4"
            />
          </div>
        )}

        {/* Extracted Options */}
        <div className="card">
          <label className="label">Video Parameters (editable)</label>
          <div className="options-grid">
            <input
              className="input"
              placeholder="Duration (e.g., 30 sec)"
              value={options.duration}
              onChange={(e) => updateOption('duration', e.target.value)}
            />
            <input
              className="input"
              placeholder="Language"
              value={options.language}
              onChange={(e) => updateOption('language', e.target.value)}
            />
            <input
              className="input"
              placeholder="Platform"
              value={options.platform}
              onChange={(e) => updateOption('platform', e.target.value)}
            />
            <select
              className="select"
              value={options.size}
              onChange={(e) => updateOption('size', e.target.value)}
            >
              <option value="">Select Size</option>
              <option value="Landscape">Landscape</option>
              <option value="Vertical">Vertical</option>
              <option value="Square">Square</option>
            </select>
            <input
              className="input"
              placeholder="Category"
              value={options.category}
              onChange={(e) => updateOption('category', e.target.value)}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error">
            ❌ {error}
          </div>
        )}

        {/* Generated Script */}
        {script && (
          <div className="card script-card">
            <label className="label">Generated Script</label>
            <pre className="script">{script}</pre>
            <button 
              onClick={() => navigator.clipboard.writeText(script)}
              className="btn btn-outline"
            >
              📋 Copy Script
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;