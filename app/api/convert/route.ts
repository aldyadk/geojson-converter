import { NextRequest, NextResponse } from 'next/server';

type ValidationIssue = 'invalid_latitude' | 'invalid_longitude' | 'both_invalid' | 'invalid_json';

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

interface CoordinateWarning {
  featureIndex: number;
  featureName: string;
  coordinateIndex: number;
  coordinate: [number, number];
  issue: ValidationIssue;
  message: string;
}

interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface APIResponse {
  geojson: GeoJSONResponse;
  warnings?: CoordinateWarning[];
}

// Coordinate validation function
function validateCoordinate(lat: any, lng: any): { isValid: boolean; issue?: ValidationIssue; message?: string } {
  // Check if coordinates are valid numbers
  const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
  const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
  
  const latIsNumber = !isNaN(latNum) && isFinite(latNum);
  const lngIsNumber = !isNaN(lngNum) && isFinite(lngNum);
  
  if (!latIsNumber && !lngIsNumber) {
    return {
      isValid: false,
      issue: 'both_invalid',
      message: `Invalid coordinates: latitude "${lat}" and longitude "${lng}" are not valid numbers`
    };
  } else if (!latIsNumber) {
    return {
      isValid: false,
      issue: 'invalid_latitude',
      message: `Invalid latitude: "${lat}" is not a valid number`
    };
  } else if (!lngIsNumber) {
    return {
      isValid: false,
      issue: 'invalid_longitude',
      message: `Invalid longitude: "${lng}" is not a valid number`
    };
  }
  
  // Now check ranges with valid numbers
  const latValid = latNum >= -90 && latNum <= 90;
  const lngValid = lngNum >= -180 && lngNum <= 180;
  
  if (!latValid && !lngValid) {
    return {
      isValid: false,
      issue: 'both_invalid',
      message: `Invalid coordinates: latitude ${latNum} (must be -90 to 90), longitude ${lngNum} (must be -180 to 180)`
    };
  } else if (!latValid) {
    return {
      isValid: false,
      issue: 'invalid_latitude',
      message: `Invalid latitude: ${latNum} (must be between -90 and 90 degrees)`
    };
  } else if (!lngValid) {
    return {
      isValid: false,
      issue: 'invalid_longitude',
      message: `Invalid longitude: ${lngNum} (must be between -180 and 180 degrees)`
    };
  }
  
  return { isValid: true };
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
    const coordinateWarnings: CoordinateWarning[] = [];

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
            try {
              // Parse the polygon string
              polygonData = JSON.parse(feature.polygon);
            } catch (parseError) {
              // If JSON parsing fails, add a warning and skip this feature
              coordinateWarnings.push({
                featureIndex: inputFeatures.indexOf(feature),
                featureName: feature.name,
                coordinateIndex: -1, // -1 indicates JSON parsing error
                coordinate: [0, 0],
                issue: 'invalid_json',
                message: `Invalid JSON format in polygon: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`
              });
              continue;
            }
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
          const coordinates = polygonData.map((point: any, coordIndex: number) => {
            let lat: any, lng: any;
            
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
            
            // Validate coordinates (handles both data type and range validation)
            const validation = validateCoordinate(lat, lng);
            if (!validation.isValid) {
              // Use the original values for display, but try to convert for coordinate array
              const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
              const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
              
              coordinateWarnings.push({
                featureIndex: inputFeatures.indexOf(feature),
                featureName: feature.name,
                coordinateIndex: coordIndex,
                coordinate: [isNaN(lngNum) ? 0 : lngNum, isNaN(latNum) ? 0 : latNum],
                issue: validation.issue!,
                message: validation.message!
              });
              
              // If coordinates are invalid, use 0,0 as fallback
              return [isNaN(lngNum) ? 0 : lngNum, isNaN(latNum) ? 0 : latNum];
            }
            
            // Convert to numbers for GeoJSON format
            const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
            const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
            
            return [lngNum, latNum]; // GeoJSON format: [longitude, latitude]
          });

          // Ensure the polygon is closed (first and last points are the same)
          if (coordinates.length > 0) {
            const firstPoint = coordinates[0];
            const lastPoint = coordinates[coordinates.length - 1];
            // Check if both points are valid (not NaN) before comparing
            const firstPointValid = !isNaN(firstPoint[0]) && !isNaN(firstPoint[1]);
            const lastPointValid = !isNaN(lastPoint[0]) && !isNaN(lastPoint[1]);
            
            if (firstPointValid && lastPointValid && 
                (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1])) {
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
              try {
                // Parse the polygon string
                polygonData = JSON.parse(feature.polygon);
              } catch (parseError) {
                // If JSON parsing fails, add a warning and skip this feature
                // Calculate global feature index for nested structure
                let globalFeatureIndex = 0;
                for (let i = 0; i < areas.indexOf(area); i++) {
                  globalFeatureIndex += areas[i].area_list?.length || 0;
                }
                globalFeatureIndex += area.area_list.indexOf(feature);
                
                coordinateWarnings.push({
                  featureIndex: globalFeatureIndex,
                  featureName: feature.name,
                  coordinateIndex: -1, // -1 indicates JSON parsing error
                  coordinate: [0, 0],
                  issue: 'invalid_json',
                  message: `Invalid JSON format in polygon: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`
                });
                continue;
              }
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
            const coordinates = polygonData.map((point: any, coordIndex: number) => {
              let lat: any, lng: any;
              
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
              
              // Validate coordinates (handles both data type and range validation)
              const validation = validateCoordinate(lat, lng);
              if (!validation.isValid) {
                // Calculate global feature index for nested structure
                let globalFeatureIndex = 0;
                for (let i = 0; i < areas.indexOf(area); i++) {
                  globalFeatureIndex += areas[i].area_list?.length || 0;
                }
                globalFeatureIndex += area.area_list.indexOf(feature);
                
                // Use the original values for display, but try to convert for coordinate array
                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                
                coordinateWarnings.push({
                  featureIndex: globalFeatureIndex,
                  featureName: feature.name,
                  coordinateIndex: coordIndex,
                  coordinate: [isNaN(lngNum) ? 0 : lngNum, isNaN(latNum) ? 0 : latNum],
                  issue: validation.issue!,
                  message: validation.message!
                });
                
                // If coordinates are invalid, use 0,0 as fallback
                return [isNaN(lngNum) ? 0 : lngNum, isNaN(latNum) ? 0 : latNum];
              }
              
              // Convert to numbers for GeoJSON format
              const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
              const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
              
              return [lngNum, latNum]; // GeoJSON format: [longitude, latitude]
            });

            // Ensure the polygon is closed (first and last points are the same)
            if (coordinates.length > 0) {
              const firstPoint = coordinates[0];
              const lastPoint = coordinates[coordinates.length - 1];
              // Check if both points are valid (not NaN) before comparing
              const firstPointValid = !isNaN(firstPoint[0]) && !isNaN(firstPoint[1]);
              const lastPointValid = !isNaN(lastPoint[0]) && !isNaN(lastPoint[1]);
              
              if (firstPointValid && lastPointValid && 
                  (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1])) {
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
        // Validate marker coordinates
        const validation = validateCoordinate(marker.lat, marker.lng);
        if (!validation.isValid) {
          coordinateWarnings.push({
            featureIndex: -1, // -1 indicates custom marker
            featureName: marker.name || 'Custom Marker',
            coordinateIndex: 0,
            coordinate: [marker.lng, marker.lat],
            issue: validation.issue!,
            message: `Custom marker: ${validation.message!}`
          });
        }
        
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

    return NextResponse.json({
      geojson: geojson,
      warnings: coordinateWarnings.length > 0 ? coordinateWarnings : undefined
    }, {
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
