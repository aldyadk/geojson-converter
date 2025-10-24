import { NextRequest, NextResponse } from 'next/server';

interface StationData {
  name: string;
  polygon: string | Array<{ lat?: number; lng?: number; long?: number; latitude?: number; longitude?: number; lon?: number }>;
}

interface AreaData {
  area_list: StationData[];
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
  };
  geometry: {
    type: 'Polygon' | 'Point';
    coordinates: number[][][] | number[];
  };
}

interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export async function POST(request: NextRequest) {
  try {
    const { 
      data, 
      includeMarkers = false, 
      markers = []
    }: { 
      data: AreaData[], 
      includeMarkers?: boolean,
      markers?: Array<{ lat: number, lng: number, name: string }>
    } = await request.json();

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid input: Expected an array of area data' },
        { status: 400 }
      );
    }

    const features: GeoJSONFeature[] = [];

    for (const area of data) {
      if (!area.area_list || !Array.isArray(area.area_list)) {
        continue;
      }

      for (const station of area.area_list) {
        try {
          // Handle both stringified JSON and real JSON array formats
          let polygonData: any;
          
          if (typeof station.polygon === 'string') {
            // Parse the polygon string
            polygonData = JSON.parse(station.polygon);
          } else if (Array.isArray(station.polygon)) {
            // Use the polygon array directly
            polygonData = station.polygon;
          } else {
            console.error(`Invalid polygon format for station ${station.name}:`, station.polygon);
            continue;
          }
          
          if (!Array.isArray(polygonData) || polygonData.length === 0) {
            continue;
          }

          // Convert coordinates to GeoJSON format (longitude, latitude)
          // Support multiple coordinate field formats
          const coordinates = polygonData.map((point: any) => {
            let lat: number, lng: number;
            
            // Try different coordinate field name combinations
            if (point.lat !== undefined && point.long !== undefined) {
              // Format: { lat: -6.2428, long: 106.8628 }
              lat = point.lat;
              lng = point.long;
            } else if (point.lat !== undefined && point.lng !== undefined) {
              // Format: { lat: -6.2428, lng: 106.8628 }
              lat = point.lat;
              lng = point.lng;
            } else if (point.latitude !== undefined && point.longitude !== undefined) {
              // Format: { latitude: -6.2428, longitude: 106.8628 }
              lat = point.latitude;
              lng = point.longitude;
            } else if (point.lat !== undefined && point.lon !== undefined) {
              // Format: { lat: -6.2428, lon: 106.8628 }
              lat = point.lat;
              lng = point.lon;
            } else {
              // Skip invalid coordinate format
              throw new Error(`Invalid coordinate format: ${JSON.stringify(point)}`);
            }
            
            return [lng, lat]; // GeoJSON format: [longitude, latitude]
          });

          // Ensure the polygon is closed (first and last points are the same)
          if (coordinates.length > 0) {
            const firstPoint = coordinates[0];
            const lastPoint = coordinates[coordinates.length - 1];
            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
              coordinates.push([...firstPoint]);
            }
          }

          // Add polygon feature
          const polygonFeature: GeoJSONFeature = {
            type: 'Feature',
            properties: {
              name: station.name,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            }
          };

          features.push(polygonFeature);
        } catch (error) {
          console.error(`Error processing station ${station.name}:`, error);
          // Continue processing other stations
        }
      }
    }

    // Add custom markers if requested
    if (includeMarkers && markers.length > 0) {
      for (const marker of markers) {
        const pointFeature: GeoJSONFeature = {
          type: 'Feature',
          properties: {
            name: marker.name,
          },
          geometry: {
            type: 'Point',
            coordinates: [marker.lng, marker.lat]
          }
        };

        features.push(pointFeature);
      }
    }

    const geojson: GeoJSONResponse = {
      type: 'FeatureCollection',
      features: features
    };

    return NextResponse.json(geojson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="stations.geojson"'
      }
    });

  } catch (error) {
    console.error('Error converting data to GeoJSON:', error);
    return NextResponse.json(
      { error: 'Failed to convert data to GeoJSON' },
      { status: 500 }
    );
  }
}
