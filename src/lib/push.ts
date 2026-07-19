import { getToken } from './store'

export async function registerPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await sendSubscription(existing)
      return true
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    })

    await sendSubscription(sub)
    return true
  } catch (e) {
    console.error('Push registration error:', e)
    return false
  }
}

async function sendSubscription(sub: PushSubscription) {
  const token = getToken()
  if (!token) return
  const key = sub.getKey('p256dh')
  const auth = sub.getKey('auth')
  await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      action: 'subscribe',
      endpoint: sub.endpoint,
      p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
      auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
    })
  })
}

export async function notifyTourMembers(tourId: string, title: string, body: string, url?: string) {
  const token = getToken()
  if (!token) return
  await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action: 'notify_tour_members', tourId, title, body, url })
  })
}

export async function notifyManager(managerId: string, title: string, body: string, url?: string) {
  await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'notify_manager', managerId, title, body, url })
  })
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
