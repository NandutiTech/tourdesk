self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(self.registration.showNotification(data.title || 'TourDesk', {
    body: data.body || '',
    icon: '/images/tourdesk-logo.png',
    badge: '/images/tourdesk-logo.png',
    data: data.url ? { url: data.url } : {},
    vibrate: [200, 100, 200],
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url))
  }
})
