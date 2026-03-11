console.log('App starting...');

// Simple test
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  // Test content
  const content = document.getElementById('itinerary-content');
  if (content) {
    content.innerHTML = '<div class="glass intro-section"><h1>🌟 Rome Trip PWA</h1><p>Loading your itinerary...</p></div>';
    console.log('Content set');
  } else {
    console.error('Could not find itinerary-content');
  }
});
