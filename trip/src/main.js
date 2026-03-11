// Rome Trip PWA - Main Application
console.log('App loading...');

// App State
const state = {
  currentPage: 'itinerary',
  isDarkMode: true,
  expandedDays: new Set(),
  highlightedSteps: new Set(JSON.parse(localStorage.getItem('highlightedSteps') || '[]')),
  photos: JSON.parse(localStorage.getItem('romePhotos') || '[]'),
  map: null,
  markers: []
};

// Rome Landmarks Data
const romeLandmarks = [
  { name: 'Spanish Steps', lat: 41.9055, lng: 12.4823, day: 1, desc: 'Iconic staircase and piazza' },
  { name: 'Trevi Fountain', lat: 41.9009, lng: 12.4833, day: 1, desc: 'Baroque masterpiece fountain' },
  { name: 'Colosseum', lat: 41.8902, lng: 12.4922, day: 2, desc: 'Ancient Roman amphitheater' },
  { name: 'Roman Forum', lat: 41.8925, lng: 12.4853, day: 2, desc: 'Ancient Roman ruins' },
  { name: 'Palatine Hill', lat: 41.8894, lng: 12.4864, day: 2, desc: 'One of Rome\'s seven hills' },
  { name: 'Vatican Museums', lat: 41.9065, lng: 12.4534, day: 3, desc: 'World-renowned art collection' },
  { name: 'St. Peter\'s Basilica', lat: 41.9023, lng: 12.4544, day: 3, desc: 'Renaissance masterpiece' },
  { name: 'Castel Sant\'Angelo', lat: 41.9031, lng: 12.4663, day: 3, desc: 'Historic fortress and museum' },
  { name: 'Pantheon', lat: 41.8986, lng: 12.4769, day: 4, desc: 'Ancient Roman temple' },
  { name: 'Piazza Navona', lat: 41.8991, lng: 12.4731, day: 4, desc: 'Famous baroque square' },
  { name: 'Campo de\' Fiori', lat: 41.8957, lng: 12.4723, day: 4, desc: 'Lively market square' },
  { name: 'Trastevere', lat: 41.8892, lng: 12.4684, day: 5, desc: 'Charming bohemian neighborhood' },
  { name: 'Villa Borghese', lat: 41.9142, lng: 12.4955, day: 5, desc: 'Beautiful public park' },
  { name: 'Pincio Terrace', lat: 41.9108, lng: 12.4828, day: 5, desc: 'Panoramic city views' }
];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing...');
  initTheme();
  initNavigation();
  await loadItinerary();
  initMap();
  initGallery();
  registerServiceWorker();
  console.log('App ready!');
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  state.isDarkMode = savedTheme ? savedTheme === 'dark' : true;
  applyTheme();

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    applyTheme();
  });
}

function applyTheme() {
  document.body.classList.toggle('light-mode', !state.isDarkMode);
}

// Navigation
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`${page}-page`)?.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      if (page === 'map' && state.map) setTimeout(() => state.map.invalidateSize(), 100);
    });
  });
}

// Load and Parse Itinerary from Markdown file
async function loadItinerary() {
  try {
    // Fetch the markdown file from public folder
    const response = await fetch('./itinerary.md');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    console.log('Loaded markdown:', markdown.substring(0, 100) + '...');
    const parsed = parseItinerary(markdown);
    renderItinerary(parsed);
  } catch (error) {
    console.error('Failed to load itinerary:', error);
    document.getElementById('itinerary-content').innerHTML = `
      <div class="glass intro-section">
        <h1>Error Loading Itinerary</h1>
        <p>Could not load itinerary.md. Make sure the file exists in the public folder.</p>
        <p style="color: var(--theme-1); margin-top: 10px;">Error: ${error.message}</p>
      </div>
    `;
  }
}

function parseItinerary(markdown) {
  const lines = markdown.split('\n');
  const result = { title: '', intro: '', days: [] };
  let currentDay = null;
  let currentDest = null;
  let i = 0;

  // Parse title
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('# ') && !result.title) {
      result.title = line.substring(2);
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('## ')) {
        if (lines[i].trim() && !lines[i].trim().startsWith('#')) {
          result.intro += lines[i] + '\n';
        }
        i++;
      }
      break;
    }
    i++;
  }

  // Parse days
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line.startsWith('## Day ') || line.startsWith('## Cost')) {
      if (currentDay) {
        if (currentDest) currentDay.destinations.push(currentDest);
        result.days.push(currentDay);
      }
      if (line.startsWith('## Cost')) break;
      currentDay = { title: line.substring(3), intro: '', destinations: [], tips: [], food: [] };
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('### ') && !lines[i].trim().startsWith('## ')) {
        if (lines[i].trim()) currentDay.intro += lines[i] + '\n';
        i++;
      }
    } else if (line.startsWith('### ') && currentDay) {
      if (currentDest) currentDay.destinations.push(currentDest);
      currentDest = { title: line.substring(4), timeSections: [], tips: [], food: [] };
      i++;
    } else if (line.startsWith('**Morning:**') && currentDest) {
      currentDest.timeSections.push({ time: 'Morning', content: line.substring(12).trim() });
      i++;
    } else if (line.startsWith('**Afternoon:**') && currentDest) {
      currentDest.timeSections.push({ time: 'Afternoon', content: line.substring(14).trim() });
      i++;
    } else if (line.startsWith('**Evening:**') && currentDest) {
      currentDest.timeSections.push({ time: 'Evening', content: line.substring(12).trim() });
      i++;
    } else if (line.startsWith('**Night:**') && currentDest) {
      currentDest.timeSections.push({ time: 'Night', content: line.substring(10).trim() });
      i++;
    } else if (line.startsWith('### Tips') && currentDay) {
      if (currentDest) { currentDay.destinations.push(currentDest); currentDest = null; }
      i++;
      while (i < lines.length && lines[i].trim().startsWith('* ')) {
        currentDay.tips.push(lines[i].trim().substring(2));
        i++;
      }
    } else if (line.startsWith('### Food Recommendations') && currentDay) {
      if (currentDest) { currentDay.destinations.push(currentDest); currentDest = null; }
      i++;
      while (i < lines.length && lines[i].trim().startsWith('* ')) {
        currentDay.food.push(lines[i].trim().substring(2));
        i++;
      }
    } else {
      i++;
    }
  }

  if (currentDay) {
    if (currentDest) currentDay.destinations.push(currentDest);
    result.days.push(currentDay);
  }

  return result;
}

function renderItinerary(data) {
  document.getElementById('app-title').textContent = data.title || 'Rome Trip';
  document.title = data.title || 'Rome Trip';

  let html = `
    <div class="glass glow-border intro-section">
      <h1>${data.title}</h1>
      <p>${data.intro.trim()}</p>
    </div>
  `;

  data.days.forEach((day, dayIdx) => {
    const dayId = `day-${dayIdx}`;
    html += `
      <div class="glass glow-border day-card" data-day="${dayId}">
        <div class="day-header" onclick="toggleDay('${dayId}')">
          <h2>${day.title}</h2>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
        <div class="day-content">
          ${day.intro.trim() ? `<p style="padding: 0 16px; color: var(--secondary-text);">${day.intro.trim()}</p>` : ''}
    `;

    day.destinations.forEach((dest, destIdx) => {
      html += `<div class="destination-card glass"><h3>${dest.title}</h3>`;
      dest.timeSections.forEach((section, secIdx) => {
        const stepId = `${dayId}-${destIdx}-${secIdx}`;
        const icons = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };
        const highlighted = state.highlightedSteps.has(stepId);
        html += `
          <div class="time-section">
            <div class="step-item ${highlighted ? 'highlighted' : ''}" data-step="${stepId}" onclick="toggleStep('${stepId}')">
              <div class="step-header">
                <div class="step-checkbox"></div>
                <h4>${icons[section.time] || '📍'} ${section.time}</h4>
              </div>
              <p>${section.content}</p>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    });

    if (day.tips.length) {
      html += `<div class="tips-section"><h4>💡 Tips</h4><ul>${day.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
    }
    if (day.food.length) {
      html += `<div class="food-section"><h4>🍽️ Food Recommendations</h4><ul>${day.food.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
    }

    html += `</div></div>`;
  });

  document.getElementById('itinerary-content').innerHTML = html;
}

// Global functions
window.toggleDay = function(dayId) {
  const card = document.querySelector(`[data-day="${dayId}"]`);
  if (card) {
    card.classList.toggle('expanded');
    state.expandedDays.has(dayId) ? state.expandedDays.delete(dayId) : state.expandedDays.add(dayId);
  }
};

window.toggleStep = function(stepId) {
  const step = document.querySelector(`[data-step="${stepId}"]`);
  if (step) {
    step.classList.toggle('highlighted');
    state.highlightedSteps.has(stepId) ? state.highlightedSteps.delete(stepId) : state.highlightedSteps.add(stepId);
    localStorage.setItem('highlightedSteps', JSON.stringify([...state.highlightedSteps]));
  }
};

// Map
function initMap() {
  if (typeof L === 'undefined') return;
  state.map = L.map('map-container').setView([41.9028, 12.4964], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(state.map);
  romeLandmarks.forEach(lm => {
    L.marker([lm.lat, lm.lng]).addTo(state.map)
      .bindPopup(`<b>${lm.name}</b><br>Day ${lm.day}<br>${lm.desc}`);
  });
}

// Gallery
function initGallery() {
  renderGallery();
  document.getElementById('add-photo-btn')?.addEventListener('click', () => {
    document.getElementById('photo-input')?.click();
  });
  document.getElementById('photo-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        state.photos.unshift({ id: Date.now(), src: ev.target.result, name: file.name });
        localStorage.setItem('romePhotos', JSON.stringify(state.photos));
        renderGallery();
      };
      reader.readAsDataURL(file);
    }
  });
  document.getElementById('close-viewer')?.addEventListener('click', () => {
    document.getElementById('image-viewer').classList.remove('active');
  });
  document.getElementById('image-viewer')?.addEventListener('click', (e) => {
    if (e.target.id === 'image-viewer') e.target.classList.remove('active');
  });
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const addBtn = document.getElementById('add-photo-btn');
  if (!grid || !addBtn) return;
  while (grid.firstChild !== addBtn) grid.removeChild(grid.firstChild);
  grid.appendChild(addBtn);
  state.photos.forEach(photo => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `<img src="${photo.src}" alt="${photo.name}">`;
    item.addEventListener('click', () => {
      document.getElementById('viewer-image').src = photo.src;
      document.getElementById('image-viewer').classList.add('active');
    });
    grid.insertBefore(item, addBtn);
  });
}

// Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(r => console.log('SW registered:', r.scope))
      .catch(e => console.log('SW registration failed:', e));
  }
}
