export async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if (data && data.display_name) {
      // Extract a shorter name if possible, like city/country
      const address = data.address;
      if (address) {
        const city = address.city || address.town || address.village || address.county;
        const country = address.country;
        if (city && country) return `${city}, ${country}`;
        if (country) return country;
      }
      return data.display_name;
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
  }
  return null;
}
