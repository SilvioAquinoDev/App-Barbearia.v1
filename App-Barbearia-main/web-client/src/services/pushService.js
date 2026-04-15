/* Web Push subscription helper for the web-client 
import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const { data } = await api.get('/web-push/vapid-public-key');
    const vapidPublicKey = data.publicKey;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Save subscription to backend
    const subJson = subscription.toJSON();
    await api.post('/web-push/subscribe', {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    });

    console.log('Push notification subscribed successfully');
    return true;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return false;
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}*/


/* Web Push subscription helper for the web-client 
import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verificar se já está inscrito
export async function isSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Verificar permissão atual
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'not-supported';
  return Notification.permission;
}

// Pedir permissão (apenas quando necessário)
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }
  
  // Se já tem permissão, retorna true
  if (Notification.permission === 'granted') {
    return true;
  }
  
  // Se foi negado, não pede de novo
  if (Notification.permission === 'denied') {
    console.log('Notification permission was denied');
    return false;
  }
  
  // Pedir permissão (será chamado por ação do usuário)
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Inscrever para push (requer permissão já concedida)
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  // Verificar permissão antes de inscrever
  if (Notification.permission !== 'granted') {
    console.log('Permission not granted. Call requestNotificationPermission first.');
    return false;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const { data } = await api.get('/web-push/vapid-public-key');
    const vapidPublicKey = data.publicKey;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Save subscription to backend
    const subJson = subscription.toJSON();
    await api.post('/web-push/subscribe', {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    });

    console.log('Push notification subscribed successfully');
    return true;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return false;
  }
}

// Função completa que pede permissão APENAS se necessário e depois inscreve
export async function enablePushNotifications() {
  // Verificar se já está inscrito
  const subscribed = await isSubscribed();
  if (subscribed) {
    console.log('Already subscribed to push notifications');
    return true;
  }
  
  // Verificar permissão atual
  const permission = getNotificationPermission();
  
  if (permission === 'denied') {
    console.log('Notification permission denied. Cannot enable.');
    return false;
  }
  
  if (permission === 'granted') {
    // Já tem permissão, só inscrever
    return await subscribeToPush();
  }
  
  // permission === 'default' - precisa pedir permissão primeiro
  // Nota: Isso deve ser chamado por ação do usuário (clique de botão)
  const granted = await requestNotificationPermission();
  if (granted) {
    return await subscribeToPush();
  }
  
  return false;
}*/



/* Web Push subscription helper for the web-client */
import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verifica se o navegador suporta push
export function isPushSupported() {
  return !!(navigator.serviceWorker && 
            window.PushManager && 
            Notification);
}

// Verifica se está em HTTPS (obrigatório)
export function isSecureContext() {
  return location.protocol === 'https:' || 
         location.hostname === 'localhost' ||
         location.hostname === '127.0.0.1';
}

// Verifica se já está inscrito
export async function isSubscribed() {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Verificar permissão atual
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'not-supported';
  return Notification.permission;
}

// Pedir permissão (apenas quando necessário)
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    console.log('Notification permission was denied');
    return false;
  }
  
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
}

// Inscrever para push
export async function subscribeToPush() {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return false;
  }

  if (!isSecureContext()) {
    console.error('Push notifications require HTTPS!');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.log('Permission not granted');
    return false;
  }

  try {
    // Garante que o Service Worker está registrado e ativo
    let registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      console.log('Registering service worker...');
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
    }
    
    // Aguarda o SW ficar ativo
    await navigator.serviceWorker.ready;
    
    // Verifica se já existe subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed');
      return true;
    }

    // Get VAPID public key from backend
    const { data } = await api.get('/web-push/vapid-public-key');
    
    if (!data || !data.publicKey) {
      console.error('Invalid VAPID public key');
      return false;
    }
    
    const vapidPublicKey = data.publicKey;

    // Subscribe to push com opções específicas para mobile
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Save subscription to backend
    const subJson = subscription.toJSON();
    await api.post('/web-push/subscribe', {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      userAgent: navigator.userAgent,
      platform: 'mobile-web'
    });

    console.log('Push notification subscribed successfully');
    return true;
  } catch (error) {
    console.error('Push subscription failed:', error);
    
    // Tratamento de erros comuns
    if (error.code === 20) { // AbortError
      console.log('Subscription was aborted');
    } else if (error.name === 'InvalidStateError') {
      console.log('Push subscription already in progress');
    } else if (error.message?.includes('ApplicationServerKey')) {
      console.error('Invalid VAPID key');
    }
    
    return false;
  }
}

// Função completa para ativar notificações
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    console.log('Push not supported');
    return false;
  }
  
  if (!isSecureContext()) {
    console.error('⚠️ Push notifications require HTTPS!');
    alert('Para receber notificações, o site precisa ser acessado via HTTPS');
    return false;
  }
  
  // Verifica se já está inscrito
  const subscribed = await isSubscribed();
  if (subscribed) {
    console.log('Already subscribed');
    return true;
  }
  
  const permission = getNotificationPermission();
  
  if (permission === 'denied') {
    console.log('Permission denied');
    return false;
  }
  
  if (permission === 'granted') {
    return await subscribeToPush();
  }
  
  // permission === 'default'
  const granted = await requestNotificationPermission();
  if (granted) {
    return await subscribeToPush();
  }
  
  return false;
}

// Função para testar notificação (útil para debug)
export async function testNotification() {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Teste', {
    body: 'Notificação funcionando!',
    icon: '/icons/icon-192x192.png',
    requireInteraction: true
  });
}
