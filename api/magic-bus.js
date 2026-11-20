import gtfs from 'gtfs-realtime-bindings';

const feedUrl = 'https://mbus.ltp.umich.edu/gtfsrt/vehicles';
const maxAgeSeconds = 180;

export function parseVehicles(bytes, now = Date.now() / 1000) {
  const feed = gtfs.transit_realtime.FeedMessage.decode(bytes);
  const timestamp = Number(feed.header.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || now - timestamp > maxAgeSeconds) {
    throw new Error('Magic Bus feed is stale');
  }

  const vehicles = feed.entity.flatMap(entity => {
    const bus = entity.vehicle;
    if (!bus?.position || entity.isDeleted || !Object.hasOwn(bus.position,'latitude') || !Object.hasOwn(bus.position,'longitude')) return [];
    const {latitude:lat,longitude:lon} = bus.position;
    const updated = Number(bus.timestamp) || timestamp;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 ||
        Math.abs(lon)>180 || (lat===0 && lon===0) || now - updated > maxAgeSeconds) return [];
    return [{id:entity.id, label:bus.vehicle?.label || bus.vehicle?.id || entity.id,
      route:bus.trip?.routeId || null, lat, lon}];
  });
  return {updatedAt:timestamp * 1000, vehicles};
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({error:'Use GET.'}));
    return;
  }

  try {
    const response = await fetch(feedUrl, {signal:AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error('Magic Bus feed unavailable');
    const data = parseVehicles(new Uint8Array(await response.arrayBuffer()));
    res.setHeader('Cache-Control', 'public, s-maxage=15');
    res.end(JSON.stringify(data));
  } catch {
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({error:'Live U-M bus positions are temporarily unavailable.'}));
  }
}
