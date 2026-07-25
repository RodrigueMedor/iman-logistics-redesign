export type TrackingEvent = {
  label: string
  location: string
  timestamp: string
  completed: boolean
  detail: string
}

export type ShipmentTracking = {
  reference: string
  status: 'In transit' | 'Delivered' | 'Pending pickup' | 'Exception'
  origin: string
  destination: string
  estimatedDelivery: string
  progress: number
  lastUpdated: string
  events: TrackingEvent[]
  customer?: string
  carrier?: string
  internalNotes?: string
}

export type ShipmentStatus = ShipmentTracking['status']

const storageKey = 'iman-demo-shipments'

const inTransitShipment: ShipmentTracking = {
  reference: 'IMAN-12345',
  status: 'In transit',
  origin: 'Miami, FL',
  destination: 'Atlanta, GA',
  estimatedDelivery: 'July 26, 2026 · Before 5:00 PM',
  progress: 68,
  lastUpdated: 'July 24, 2026 · 2:35 PM ET',
  events: [
    {
      label: 'Shipment created',
      location: 'Miami, FL',
      timestamp: 'July 23 · 8:15 AM',
      completed: true,
      detail: 'Shipment information was received and confirmed.',
    },
    {
      label: 'Picked up',
      location: 'Miami, FL',
      timestamp: 'July 23 · 11:40 AM',
      completed: true,
      detail: 'Freight was picked up from the origin facility.',
    },
    {
      label: 'In transit',
      location: 'Gainesville, FL',
      timestamp: 'July 24 · 2:35 PM',
      completed: true,
      detail: 'The shipment is moving toward its destination.',
    },
    {
      label: 'Out for delivery',
      location: 'Atlanta, GA',
      timestamp: 'Pending',
      completed: false,
      detail: 'The shipment will be assigned for final delivery.',
    },
    {
      label: 'Delivered',
      location: 'Atlanta, GA',
      timestamp: 'Pending',
      completed: false,
      detail: 'Delivery confirmation will appear here.',
    },
  ],
}

const demoShipments: Record<string, ShipmentTracking> = {
  'IMAN-12345': inTransitShipment,
  'IMAN-67890': {
    ...inTransitShipment,
    reference: 'IMAN-67890',
    status: 'Delivered',
    origin: 'Dallas, TX',
    destination: 'Houston, TX',
    estimatedDelivery: 'Delivered July 23, 2026 · 1:18 PM',
    progress: 100,
    lastUpdated: 'July 23, 2026 · 1:18 PM CT',
    events: [
      { label: 'Shipment created', location: 'Dallas, TX', timestamp: 'July 22 · 7:45 AM', completed: true, detail: 'Shipment information was received and confirmed.' },
      { label: 'Picked up', location: 'Dallas, TX', timestamp: 'July 22 · 10:20 AM', completed: true, detail: 'Freight was picked up from the origin facility.' },
      { label: 'In transit', location: 'Huntsville, TX', timestamp: 'July 23 · 8:05 AM', completed: true, detail: 'The shipment moved toward its destination.' },
      { label: 'Out for delivery', location: 'Houston, TX', timestamp: 'July 23 · 11:32 AM', completed: true, detail: 'The shipment was assigned for final delivery.' },
      { label: 'Delivered', location: 'Houston, TX', timestamp: 'July 23 · 1:18 PM', completed: true, detail: 'Delivery was completed and confirmed.' },
    ],
  },
  'IMAN-24680': {
    ...inTransitShipment,
    reference: 'IMAN-24680',
    status: 'Pending pickup',
    origin: 'Charlotte, NC',
    destination: 'Nashville, TN',
    estimatedDelivery: 'July 28, 2026 · Before 6:00 PM',
    progress: 12,
    lastUpdated: 'July 24, 2026 · 9:10 AM ET',
    events: [
      { label: 'Shipment created', location: 'Charlotte, NC', timestamp: 'July 24 · 9:10 AM', completed: true, detail: 'Shipment information was received and confirmed.' },
      { label: 'Picked up', location: 'Charlotte, NC', timestamp: 'Scheduled', completed: false, detail: 'Pickup is scheduled with the origin facility.' },
      { label: 'In transit', location: '—', timestamp: 'Pending', completed: false, detail: 'Transit updates will appear after pickup.' },
      { label: 'Out for delivery', location: 'Nashville, TN', timestamp: 'Pending', completed: false, detail: 'The shipment will be assigned for final delivery.' },
      { label: 'Delivered', location: 'Nashville, TN', timestamp: 'Pending', completed: false, detail: 'Delivery confirmation will appear here.' },
    ],
  },
  'IMAN-54321': {
    ...inTransitShipment,
    reference: 'IMAN-54321',
    status: 'Exception',
    origin: 'Chicago, IL',
    destination: 'Detroit, MI',
    estimatedDelivery: 'Updated delivery estimate pending',
    progress: 52,
    lastUpdated: 'July 24, 2026 · 12:42 PM CT',
    events: [
      { label: 'Shipment created', location: 'Chicago, IL', timestamp: 'July 23 · 6:30 AM', completed: true, detail: 'Shipment information was received and confirmed.' },
      { label: 'Picked up', location: 'Chicago, IL', timestamp: 'July 23 · 9:15 AM', completed: true, detail: 'Freight was picked up from the origin facility.' },
      { label: 'Delivery exception', location: 'Gary, IN', timestamp: 'July 24 · 12:42 PM', completed: true, detail: 'A weather delay was reported. The team is reviewing the delivery schedule.' },
      { label: 'Out for delivery', location: 'Detroit, MI', timestamp: 'Pending', completed: false, detail: 'The shipment will be assigned after the delay is cleared.' },
      { label: 'Delivered', location: 'Detroit, MI', timestamp: 'Pending', completed: false, detail: 'Delivery confirmation will appear here.' },
    ],
  },
}

export const demoTrackingReferences = Object.keys(demoShipments)

export function getManagedShipments(): ShipmentTracking[] {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved) as ShipmentTracking[]
  } catch {
    // Fall back to the built-in demo records when browser storage is unavailable.
  }
  return Object.values(demoShipments)
}

export function saveManagedShipment(shipment: ShipmentTracking): ShipmentTracking[] {
  const normalized = { ...shipment, reference: shipment.reference.trim().toUpperCase() }
  const current = getManagedShipments()
  const existingIndex = current.findIndex(item => item.reference === normalized.reference)
  const next = existingIndex >= 0
    ? current.map(item => item.reference === normalized.reference ? normalized : item)
    : [normalized, ...current]
  window.localStorage.setItem(storageKey, JSON.stringify(next))
  return next
}

export async function trackShipment(reference: string): Promise<ShipmentTracking | null> {
  // This demo adapter is ready to be replaced with a carrier or TMS API request.
  await new Promise(resolve => window.setTimeout(resolve, 650))
  return getManagedShipments().find(item => item.reference === reference) ?? null
}
