import { NextRequest, NextResponse } from 'next/server';

interface FeatureData {
  name: string;
  polygon: string | Array<{ lat?: number; lng?: number; long?: number; latitude?: number; longitude?: number; lon?: number }>;
}

interface AreaData {
  area_list: FeatureData[];
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
      data: AreaData[] | FeatureData[], 
      includeMarkers?: boolean,
      markers?: Array<{ lat: number, lng: number, name: string }>
    } = await request.json();

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid input: Expected an array of feature data or area data' },
        { status: 400 }
      );
    }

    const geojsonFeatures: GeoJSONFeature[] = [];

    // Check if data is a simple array of features or nested structure
    // If any item has an 'area_list' field, it's a nested structure
    const isSimpleArray = data.length > 0 && !data.some(item => 'area_list' in item);
    
    if (isSimpleArray) {
      // Handle simple array structure: [{ name, polygon }, ...]
      const inputFeatures = data as FeatureData[];
      
      // First, validate all features have required fields
      for (let i = 0; i < inputFeatures.length; i++) {
        const feature = inputFeatures[i];
        if (!feature.name) {
          return NextResponse.json(
            { error: `Feature at index ${i}: Missing required 'name' field` },
            { status: 400 }
          );
        }
        if (!feature.polygon) {
          return NextResponse.json(
            { error: `Feature at index ${i}: Missing required 'polygon' field` },
            { status: 400 }
          );
        }
      }
      
      // Process all features
      for (const feature of inputFeatures) {
        try {
          
          // Handle both stringified JSON and real JSON array formats
          let polygonData: any;
          
          if (typeof feature.polygon === 'string') {
            // Parse the polygon string
            polygonData = JSON.parse(feature.polygon);
          } else if (Array.isArray(feature.polygon)) {
            // Use the polygon array directly
            polygonData = feature.polygon;
          } else {
            console.error(`Invalid polygon format for ${feature.name}:`, feature.polygon);
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
              name: feature.name,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            }
          };

          geojsonFeatures.push(polygonFeature);
        } catch (error) {
          console.error(`Error processing feature ${feature.name}:`, error);
          // Continue processing other features
        }
      }
    } else {
      // Handle nested structure: [{ area_list: [{ name, polygon }, ...] }, ...]
      const areas = data as AreaData[];
      
      // First, validate all features have required fields
      for (let areaIndex = 0; areaIndex < areas.length; areaIndex++) {
        const area = areas[areaIndex];
        if (!area.area_list || !Array.isArray(area.area_list)) {
          continue;
        }
        
        for (let featureIndex = 0; featureIndex < area.area_list.length; featureIndex++) {
          const feature = area.area_list[featureIndex];
          if (!feature.name) {
            return NextResponse.json(
              { error: `Feature at area[${areaIndex}].area_list[${featureIndex}]: Missing required 'name' field` },
              { status: 400 }
            );
          }
          if (!feature.polygon) {
            return NextResponse.json(
              { error: `Feature at area[${areaIndex}].area_list[${featureIndex}]: Missing required 'polygon' field` },
              { status: 400 }
            );
          }
        }
      }
      
      // Process all features
      for (const area of areas) {
        if (!area.area_list || !Array.isArray(area.area_list)) {
          continue;
        }

        for (const feature of area.area_list) {
          try {
            
            // Handle both stringified JSON and real JSON array formats
            let polygonData: any;
            
            if (typeof feature.polygon === 'string') {
              // Parse the polygon string
              polygonData = JSON.parse(feature.polygon);
            } else if (Array.isArray(feature.polygon)) {
              // Use the polygon array directly
              polygonData = feature.polygon;
            } else {
              console.error(`Invalid polygon format for ${feature.name}:`, feature.polygon);
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
                name: feature.name,
              },
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
              }
            };

            geojsonFeatures.push(polygonFeature);
          } catch (error) {
            console.error(`Error processing feature ${feature.name}:`, error);
            // Continue processing other features
          }
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

        geojsonFeatures.push(pointFeature);
      }
    }

    const geojson: GeoJSONResponse = {
      type: 'FeatureCollection',
      features: geojsonFeatures
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
