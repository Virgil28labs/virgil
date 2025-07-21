const CACHE_NAME = "virgil-cache-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// Cache strategy: Cache First for static assets, Network First for API calls
const API_CACHE_NAME = "virgil-api-cache-v1";
const STATIC_CACHE_NAME = "virgil-static-cache-v1";

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME
            ) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!request.url.startsWith("http")) {
    return;
  }

  // Handle API requests (Network First)
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets (Cache First)
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "document" ||
    request.destination === "image"
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Default to network for other requests
  event.respondWith(fetch(request));
});

// Cache First strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return offline page or error
    /* eslint-disable-next-line no-console */
    console.error("Cache First strategy failed:", error);
    throw error;
  }
}

// Network First strategy for API requests
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(API_CACHE_NAME);
      // Cache API responses for 5 minutes
      const headers = new Headers(responseClone.headers);
      headers.set("sw-cache-timestamp", Date.now().toString());
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers,
      });
      cache.put(request, cachedResponse);
    }
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cached response is still valid (5 minutes)
      const cacheTimestamp = cachedResponse.headers.get("sw-cache-timestamp");
      if (cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 300000) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

// Pomodoro Timer Background Logic
let pomodoroInterval = null;
let pomodoroState = null;

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data?.type === "POMODORO_MESSAGE") {
    handlePomodoroMessage(event.data.data);
  }
});

function handlePomodoroMessage(message) {
  switch (message.type) {
    case "START_TIMER":
      startPomodoroTimer(message.duration);
      break;
    case "PAUSE_TIMER":
      pausePomodoroTimer();
      break;
    case "RESUME_TIMER":
      resumePomodoroTimer();
      break;
    case "STOP_TIMER":
      stopPomodoroTimer();
      break;
    case "SYNC_STATE":
      syncPomodoroState(message.state);
      break;
  }
}

function startPomodoroTimer(duration) {
  stopPomodoroTimer(); // Clear any existing timer
  
  pomodoroState = {
    duration: duration,
    startTime: Date.now(),
    totalPausedTime: 0,
    isRunning: true,
  };
  
  pomodoroInterval = setInterval(() => {
    if (pomodoroState && pomodoroState.isRunning) {
      const elapsed = Date.now() - pomodoroState.startTime - pomodoroState.totalPausedTime;
      const timeRemaining = Math.max(0, pomodoroState.duration * 1000 - elapsed);
      
      // Send update to all clients
      sendToAllClients({
        type: "POMODORO_UPDATE",
        data: {
          type: "TIMER_TICK",
          timeRemaining: Math.ceil(timeRemaining / 1000),
        },
      });
      
      // Check if timer is complete
      if (timeRemaining === 0) {
        handleTimerComplete();
      }
    }
  }, 1000);
}

function pausePomodoroTimer() {
  if (pomodoroState && pomodoroState.isRunning) {
    pomodoroState.isRunning = false;
    pomodoroState.pausedAt = Date.now();
  }
}

function resumePomodoroTimer() {
  if (pomodoroState && !pomodoroState.isRunning && pomodoroState.pausedAt) {
    const pauseDuration = Date.now() - pomodoroState.pausedAt;
    pomodoroState.totalPausedTime += pauseDuration;
    pomodoroState.isRunning = true;
    pomodoroState.pausedAt = null;
  }
}

function stopPomodoroTimer() {
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  pomodoroState = null;
}

function syncPomodoroState(state) {
  if (state.isRunning && !pomodoroInterval) {
    // Restart timer based on saved state
    const elapsed = Date.now() - state.startTime - state.totalPausedTime;
    const remainingMs = state.selectedMinutes * 60 * 1000 - elapsed;
    
    if (remainingMs > 0) {
      pomodoroState = {
        duration: state.selectedMinutes * 60,
        startTime: state.startTime,
        totalPausedTime: state.totalPausedTime,
        isRunning: true,
      };
      
      // Start interval
      pomodoroInterval = setInterval(() => {
        if (pomodoroState && pomodoroState.isRunning) {
          const elapsed = Date.now() - pomodoroState.startTime - pomodoroState.totalPausedTime;
          const timeRemaining = Math.max(0, pomodoroState.duration * 1000 - elapsed);
          
          sendToAllClients({
            type: "POMODORO_UPDATE",
            data: {
              type: "TIMER_TICK",
              timeRemaining: Math.ceil(timeRemaining / 1000),
            },
          });
          
          if (timeRemaining === 0) {
            handleTimerComplete();
          }
        }
      }, 1000);
    }
  }
}

async function handleTimerComplete() {
  stopPomodoroTimer();
  
  // Send completion message to all clients
  sendToAllClients({
    type: "POMODORO_UPDATE",
    data: { type: "TIMER_COMPLETE" },
  });
  
  // Show notification if permission granted
  if (self.Notification && self.Notification.permission === "granted") {
    self.registration.showNotification("Pomodoro Complete! 🍅", {
      body: "Great work! Time for a break.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "pomodoro-complete",
      requireInteraction: true,
      actions: [
        { action: "dismiss", title: "Dismiss" },
      ],
    });
  }
}

// Send message to all clients
async function sendToAllClients(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });
  
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.action === "dismiss") {
    return;
  }
  
  // Focus or open the app
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) {
          // Focus existing window
          return clients[0].focus();
        }
        // Open new window
        return self.clients.openWindow("/");
      })
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle offline actions when back online
  /* eslint-disable-next-line no-console */
  console.log("Background sync triggered");
}
