import React, { useState } from 'react';
import { DisruptionEvent, EventSeverity } from '../types';
import { buildEventFromSeverity } from '../utils/eventRouteMapper';
import { Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface EventFormProps {
  onAddEvent: (event: DisruptionEvent) => void;
}

const SEVERITY_OPTIONS: { value: EventSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const COMMON_TAGS = [
  'suez', 'panama', 'malacca', 'asia', 'europe', 'americas',
  'red-sea', 'mediterranean', 'pacific', 'atlantic',
  'port-strike', 'weather', 'geopolitical', 'piracy',
];

const EventForm: React.FC<EventFormProps> = ({ onAddEvent }) => {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [blastRadius, setBlastRadius] = useState(500);
  const [severity, setSeverity] = useState<EventSeverity>('medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!lat && !lng && selectedTags.length === 0)) return;

    const event = buildEventFromSeverity({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      location: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
      blastRadiusKm: blastRadius,
      severity,
      affectedTags: selectedTags,
      source: 'manual',
      active: true,
      timestamp: new Date().toISOString(),
    });

    onAddEvent(event);
    setTitle('');
    setDescription('');
    setLat('');
    setLng('');
    setBlastRadius(500);
    setSeverity('medium');
    setSelectedTags([]);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all text-sm"
      >
        <Plus className="w-4 h-4" /> Add Manual Event
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white">New Disruption Event</h4>
        <button type="button" onClick={() => setExpanded(false)} className="text-white/30 hover:text-white/60 text-xs">Cancel</button>
      </div>

      <input
        type="text"
        placeholder="Event title (e.g. Suez Canal Blockage)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
        required
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={lat}
          onChange={e => setLat(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={lng}
          onChange={e => setLng(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
          Blast Radius: {blastRadius} km
        </label>
        <input
          type="range"
          min={50}
          max={5000}
          step={50}
          value={blastRadius}
          onChange={e => setBlastRadius(Number(e.target.value))}
          className="w-full accent-amber-500"
          style={{ accentColor: theme.accent }}
        />
        <div className="flex justify-between text-[9px] text-white/20">
          <span>50 km</span><span>5000 km</span>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1 block">Severity</label>
        <div className="flex gap-2">
          {SEVERITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSeverity(opt.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                severity === opt.value
                  ? `${opt.color} text-white`
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1 block">Region Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                selectedTags.includes(tag)
                  ? 'text-white'
                  : 'bg-white/5 text-white/30 hover:text-white/50'
              }`}
              style={selectedTags.includes(tag) ? { backgroundColor: theme.accent } : {}}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-2 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110"
        style={{ backgroundColor: theme.accent }}
      >
        Add Event
      </button>
    </form>
  );
};

export default EventForm;
