import { memo, useState, useCallback, useEffect } from 'react';
import type { ModelOption } from '../../types/chat.types';
import './ui-controls.css';

interface ModelSelectorProps {
  selectedModel: string;
  models: ModelOption[];
  onModelChange: (modelId: string) => void;
}

const ModelSelector = memo(function ModelSelector({
  selectedModel,
  models,
  onModelChange,
}: ModelSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Get current model info
  const getCurrentModel = useCallback(() => {
    return models.find(m => m.id === selectedModel) || models[0];
  }, [selectedModel, models]);

  const currentModel = getCurrentModel();

  // Handle model selection
  const handleModelChange = useCallback((modelId: string) => {
    onModelChange(modelId);
    setShowDropdown(false);
  }, [onModelChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element)?.closest('.model-selector')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  // Generate display name for compact view
  const getDisplayName = (model: ModelOption) => {
    let displayName = model.name.replace('GPT-', '').replace(' Mini', '');

    // Apply shortened versions for specific models
    if (displayName.includes('4.1') && model.name.toLowerCase().includes('mini')) {
      displayName = displayName.replace('4.1', '4.1m');
    }
    if (displayName.toLowerCase().includes('o1') && model.name.toLowerCase().includes('mini')) {
      displayName = displayName.replace(/o1/i, 'o1m');
    }
    if (displayName.toLowerCase().includes('o4') && model.name.toLowerCase().includes('mini')) {
      displayName = displayName.replace(/o4/i, 'o4m');
    }

    return displayName;
  };

  return (
    <div className="model-selector">
      <button
        className="model-dropdown-btn compact"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        role="combobox"
      >
        🤖 {getDisplayName(currentModel)}
      </button>

      {showDropdown && (
        <div className="model-dropdown" role="listbox">
          {models.map(model => (
            <div
              key={model.id}
              className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
              onClick={() => handleModelChange(model.id)}
              data-keyboard-nav
              tabIndex={0}
              role="option"
              aria-selected={selectedModel === model.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModelChange(model.id);
                }
              }}
            >
              <div className="model-name">{model.name}</div>
              <div className="model-description">{model.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export { ModelSelector };
export default ModelSelector;
