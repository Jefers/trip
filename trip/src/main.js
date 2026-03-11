import { marked } from 'marked';

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
  initTheme();
  initNavigation();
  await loadItinerary();
  initMap();
  initGallery();
  registerServiceWorker();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  state.isDarkMode = savedTheme ? savedTheme === 'dark' : true;
  applyTheme();

  document.getElementById('theme-toggle').addEventListener('click', () => {
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    applyTheme();
  });
}

function applyTheme() {
  if (state.isDarkMode) {
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.add('light-mode');
  }
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      switchPage(page);
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function switchPage(page) {
  state.currentPage = page;
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`${page}-page`).classList.add('active');
  
  // Invalidate map size when switching to map page
  if (page === 'map' && state.map) {
    setTimeout(() => state.map.invalidateSize(), 100);
  }
}

// Load and Parse Itinerary
async function loadItinerary() {
  try {
    const response = await fetch('./src/itinerary.md');
    const markdown = await response.text();
    const parsed = parseItinerary(markdown);
    renderItinerary(parsed);
  } catch (error) {
    console.error('Failed to load itinerary:', error);
    document.getElementById('itinerary-content').innerHTML = `
      <div class="glass intro-section">
        <h1>Rome Trip</h1>
        <p>Unable to load itinerary. Please check your connection and refresh.</p>
      </div>
    `;
  }
}

function parseItinerary(markdown) {
  const lines = markdown.split('\n');
  const result = {
    title: '',
    intro: '',
    days: []
  };

  let currentDay = null;
  let currentDestination = null;
  let currentSection = null;
  let i = 0;

  // Parse title
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('# ') && !result.title) {
      result.title = line.substring(2);
      i++;
      // Get intro paragraph
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

  // Parse days and destinations
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line.startsWith('## Day ')) {
      if (currentDay) result.days.push(currentDay);
      currentDay = {
        title: line.substring(3),
        intro: '',
        destinations: []
      };
      i++;
      // Get day intro
      while (i < lines.length && !lines[i].trim().startsWith('### ') && !lines[i].trim().startsWith('## ')) {
        if (lines[i].trim() && !lines[i].trim().startsWith('###')) {
          currentDay.intro += lines[i] + '\n';
        }
        i++;
      }
    } else if (line.startsWith('### ') && currentDay) {
      if (currentDestination) currentDay.destinations.push(currentDestination);
      currentDestination = {
        title: line.substring(4),
        timeSections: [],
        tips: [],
        food: []
      };
      i++;
    } else if (line.startsWith('**Morning:**') && currentDestination) {
      currentDestination.timeSections.push({
        time: 'Morning',
        content: line.substring(12).trim()
      });
      i++;
    } else if (line.startsWith('**Afternoon:**') && currentDestination) {
      currentDestination.timeSections.push({
        time: 'Afternoon',
        content: line.substring(14).trim()
      });
      i++;
    } else if (line.startsWith('**Evening:**') && currentDestination) {
      currentDestination.timeSections.push({
        time: 'Evening',
        content: line.substring(12).trim()
      });
      i++;
    } else if (line.startsWith('**Night:**') && currentDestination) {
      currentDestination.timeSections.push({
        time: 'Night',
        content: line.substring(10).trim()
      });
      i++;
    } else if (line.startsWith('### Tips') && currentDay) {
      if (currentDestination) currentDay.destinations.push(currentDestination);
      currentDestination = null;
      i++;
      while (i < lines.length && lines[i].trim().startsWith('* ')) {
        currentDay.tips.push(lines[i].trim().substring(2));
        i++;
      }
    } else if (line.startsWith('### Food Recommendations') && currentDay) {
      if (currentDestination) currentDay.destinations.push(currentDestination);
      currentDestination = null;
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
    if (currentDestination) currentDay.destinations.push(currentDestination);
    result.days.push(currentDay);
  }

  return result;
}

function renderItinerary(data) {
  // Update app title
  document.getElementById('app-title').textContent = data.title;
  document.title = data.title;

  let html = `
    <div class="glass glow-border intro-section">
      <h1>${data.title}</h1>
      <p>${marked.parse(data.intro.trim())}</p>
    </div>
  `;

  data.days.forEach((day, dayIndex) => {
    const dayId = `day-${dayIndex}`;
    const isExpanded = state.expandedDays.has(dayId);
    
    html += `
      <div class="glass glow-border day-card ${isExpanded ? 'expanded' : ''}" data-day="${dayId}">
        <div class="day-header" onclick="toggleDay('${dayId}')">
          <h2>${day.title}</h2>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
        <div class="day-content">
          ${day.intro.trim() ? `<p style="padding: 0 16px; color: var(--secondary-text);">${marked.parse(day.intro.trim())}</p>` : ''}
    `;

    day.destinations.forEach((dest, destIndex) => {
      html += `
        <div class="destination-card glass">
          <h3>${dest.title}</h3>
      `;

      dest.timeSections.forEach((section, sectionIndex) => {
        const stepId = `${dayId}-dest-${destIndex}-time-${sectionIndex}`;
        const isHighlighted = state.highlightedSteps.has(stepId);
        
        html += `
          <div class="time-section">
            <div class="step-item ${isHighlighted ? 'highlighted' : ''}" data-step="${stepId}" onclick="toggleStep('${stepId}')">
              <div class="step-header">
                <div class="step-checkbox"></div>
                <h4>${getTimeIcon(section.time)} ${section.time}</h4>
              </div>
              <p>${section.content}</p>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    if (day.tips.length > 0) {
      html += `
        <div class="tips-section">
          <h4>💡 Tips</h4>
          <ul>
            ${day.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (day.food.length > 0) {
      html += `
        <div class="food-section">
          <h4>🍽️ Food Recommendations</h4>
          <ul>
            ${day.food.map(food => `<li>${food}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  });

  document.getElementById('itinerary-content').innerHTML = html;
}

function getTimeIcon(time) {
  const icons = {
    'Morning': '🌅',
    'Afternoon': '☀️',
    'Evening': '🌆',
    'Night': '🌙'
  };
  return icons[time] || '📍';
}

// Global functions for onclick handlers
window.toggleDay = function(dayId) {
  const card = document.querySelector(`[data-day="${dayId}"]`);
  if (card) {
    card.classList.toggle('expanded');
    if (state.expandedDays.has(dayId)) {
      state.expandedDays.delete(dayId);
    } else {
      state.expandedDays.add(dayId);
    }
  }
};

window.toggleStep = function(stepId) {
  const step = document.querySelector(`[data-step="${stepId}"]`);
  if (step) {
    step.classList.toggle('highlighted');
    if (state.highlightedSteps.has(stepId)) {
      state.highlightedSteps.delete(stepId);
    } else {
      state.highlightedSteps.add(stepId);
    }
    localStorage.setItem('highlightedSteps', JSON.stringify([...state.highlightedSteps]));
  }
};

// Map Management
function initMap() {
  // Initialize map centered on Rome
  state.map = L.map('map-container', {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([41.9028, 12.4964], 13);

  // Add tile layer with dark theme for dark mode
  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  });
  
  tileLayer.addTo(state.map);

  // Add markers for landmarks
  romeLandmarks.forEach(landmark => {
    const marker = L.marker([landmark.lat, landmark.lng])
      .addTo(state.map)
      .bindPopup(`
        <div class="map-popup">
          <h4>${landmark.name}</h4>
          <p>Day ${landmark.day}</p>
          <p>${landmark.desc}</p>
        </div>
      `);
    
    state.markers.push(marker);
  });

  // Update map tiles based on theme
  updateMapTiles();
}

function updateMapTiles() {
  // The tile layer will be styled based on the page's CSS
}

// Gallery Management
function initGallery() {
  renderGallery();
  
  // Add photo button
  document.getElementById('add-photo-btn').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });

  // Handle photo selection
  document.getElementById('photo-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        state.photos.unshift({
          id: Date.now(),
          src: event.target.result,
          name: file.name
        });
        localStorage.setItem('romePhotos', JSON.stringify(state.photos));
        renderGallery();
      };
      reader.readAsDataURL(file);
    }
  });

  // Close image viewer
  document.getElementById('close-viewer').addEventListener('click', () => {
    document.getElementById('image-viewer').classList.remove('active');
  });

  // Close on background click
  document.getElementById('image-viewer').addEventListener('click', (e) => {
    if (e.target.id === 'image-viewer') {
      document.getElementById('image-viewer').classList.remove('active');
    }
  });
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const addBtn = document.getElementById('add-photo-btn');
  
  // Clear existing photos (keep add button)
  while (grid.firstChild && grid.firstChild !== addBtn) {
    grid.removeChild(grid.firstChild);
  }
  
  // Move add button to end
  grid.appendChild(addBtn);

  // Add photos
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

// Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
}

// Export for potential module usage
export { state, switchPage };
