// Representative origins for fictional listings. Coordinates are latitude, longitude.
const origins = {
  'Central Campus':[42.2735,-83.7394], 'North Campus':[42.2951,-83.7174],
  Kerrytown:[42.2849,-83.748], 'Old West Side':[42.2783,-83.759],
  'South University':[42.2729,-83.7324], 'Burns Park':[42.2661,-83.734],
  'Fuller Road':[42.2889,-83.7247], Downtown:[42.2801,-83.7474]
};
export const stops = {
  'Central Campus Transit Center':[42.2773,-83.7351], 'Pierpont Commons':[42.2911,-83.7178],
  Rackham:[42.2808,-83.7384], 'Fifth & Washington':[42.2805,-83.7462],
  'Plymouth & Barton':[42.3,-83.7332], 'Glen & Catherine':[42.2831,-83.7347]
};
export const library = {name:'Shapiro Undergraduate Library (UGLi)',lat:42.27563,lon:-83.73718};
export const originFor = home => origins[home.area];
export function walkMinutes(a,b) {
  const radians = Math.PI/180;
  const north = (a[0]-b[0])*111.2;
  const east = (a[1]-b[1])*111.2*Math.cos((a[0]+b[0])/2*radians);
  return Math.max(1,Math.round(Math.hypot(north,east)*1.25/4.8*60));
}
export function isLocalPlace(place) {
  return typeof place?.name==='string' && place.name.trim() && Number.isFinite(place.lat) &&
    Number.isFinite(place.lon) && place.lat>=42.19 && place.lat<=42.36 && place.lon>=-83.87 && place.lon<=-83.61;
}
export function placeKey(place) { return place.lat.toFixed(5)+','+place.lon.toFixed(5); }
