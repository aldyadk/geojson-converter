import { NextRequest, NextResponse } from 'next/server';

interface StationData {
  id: number;
  id_landmark: number;
  name: string;
  address: string;
  type: string;
  polygon: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface AreaData {
  id: number;
  area_name: string;
  area_list: StationData[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_deleted: boolean;
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
      markerData 
    }: { 
      data: AreaData[], 
      includeMarkers?: boolean,
      markerData?: { lat: number, lng: number, name: string }
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
          // Parse the polygon string
          const polygonData = JSON.parse(station.polygon);
          
          if (!Array.isArray(polygonData) || polygonData.length === 0) {
            continue;
          }

          // Convert lat/long to GeoJSON format (longitude, latitude)
          const coordinates = polygonData.map((point: { lat: number; long: number }) => [
            point.long, // longitude first
            point.lat   // latitude second
          ]);

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
          console.error(`Error processing station ${station.id}:`, error);
          // Continue processing other stations
        }
      }
    }

    // Add custom marker if requested
    if (includeMarkers && markerData) {
      const pointFeature: GeoJSONFeature = {
        type: 'Feature',
        properties: {
          name: markerData.name,
        },
        geometry: {
          type: 'Point',
          coordinates: [markerData.lng, markerData.lat]
        }
      };

      features.push(pointFeature);
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
