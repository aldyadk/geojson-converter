'use client';

import { useState } from 'react';

export default function Home() {
  const [inputData, setInputData] = useState('');
  const [outputData, setOutputData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeMarkers, setIncludeMarkers] = useState(false);
  const [markers, setMarkers] = useState<Array<{lat: string, lng: string, name: string}>>([]);
  const [showToast, setShowToast] = useState(false);

  const handleConvert = async () => {
    if (!inputData.trim()) {
      setError('Please enter JSON data');
      return;
    }

    setLoading(true);
    setError('');
    setOutputData('');

    try {
      // Validate JSON
      const parsedData = JSON.parse(inputData);
      
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: parsedData,
          includeMarkers: includeMarkers,
          markers: includeMarkers ? markers.map(marker => ({
            lat: parseFloat(marker.lat),
            lng: parseFloat(marker.lng),
            name: marker.name || 'Custom Marker'
          })) : []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert data');
      }

      const geojson = await response.json();
      setOutputData(JSON.stringify(geojson, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!outputData) return;

    const blob = new Blob([outputData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!outputData) return;

    try {
      await navigator.clipboard.writeText(outputData);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = outputData;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const addMarker = () => {
    setMarkers([...markers, { lat: '', lng: '', name: '' }]);
  };

  const removeMarker = (index: number) => {
    setMarkers(markers.filter((_, i) => i !== index));
  };

  const updateMarker = (index: number, field: 'lat' | 'lng' | 'name', value: string) => {
    const updatedMarkers = [...markers];
    updatedMarkers[index][field] = value;
    setMarkers(updatedMarkers);
  };

  const handleLoadExample = () => {
    setInputData(`[
  {
    "area_list": [
      {
        "name": "Stasiun LRT Ciliwung",
        "polygon": "[{\\"lat\\":-6.242799927901021,\\"long\\":106.86279925611093},{\\"lat\\":-6.243423842559002,\\"long\\":106.86278852727487},{\\"lat\\":-6.243439840360971,\\"long\\":106.86401161458566},{\\"lat\\":-6.243605150952711,\\"long\\":106.86500403192117},{\\"lat\\":-6.243722468115187,\\"long\\":106.86544927861765},{\\"lat\\":-6.243146547247209,\\"long\\":106.86548146512582},{\\"lat\\":-6.242959906089307,\\"long\\":106.86468753125742}]"
      }
    ]
  }
]`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GeoJSON Maker
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convert station data with polygon coordinates to GeoJSON format. 
            Perfect for mapping applications and GIS tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Input Data</h2>
              <button
                onClick={handleLoadExample}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Load Example
              </button>
            </div>
            
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Paste your JSON data here..."
              className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeMarkers}
                  onChange={(e) => setIncludeMarkers(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include custom marker</span>
              </div>
              
              {includeMarkers && (
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Custom Markers</h3>
                    <button
                      type="button"
                      onClick={addMarker}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      + Add Marker
                    </button>
                  </div>
                  
                  {markers.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No markers added yet. Click "Add Marker" to create one.
                    </p>
                  )}
                  
                  {markers.map((marker, index) => (
                    <div key={index} className="bg-white p-3 rounded-md border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Marker {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeMarker(index)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Latitude
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={marker.lat}
                            onChange={(e) => updateMarker(index, 'lat', e.target.value)}
                            placeholder="e.g., -6.2428"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Longitude
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={marker.lng}
                            onChange={(e) => updateMarker(index, 'lng', e.target.value)}
                            placeholder="e.g., 106.8628"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Marker Name (optional)
                        </label>
                        <input
                          type="text"
                          value={marker.name}
                          onChange={(e) => updateMarker(index, 'name', e.target.value)}
                          placeholder="e.g., Custom Location"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={handleConvert}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Converting...' : 'Convert to GeoJSON'}
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">GeoJSON Output</h2>
              {outputData && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    Download
                  </button>
                </div>
              )}
            </div>
            
            <textarea
              value={outputData}
              readOnly
              placeholder="GeoJSON output will appear here..."
              className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm resize-none bg-white text-gray-900"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">How to use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Paste your JSON data in the input field (or click "Load Example" to see the expected format)</li>
            <li>Click "Convert to GeoJSON" to transform your data</li>
            <li>Download the resulting GeoJSON file or copy the output</li>
            <li>Use the GeoJSON in mapping applications like Leaflet, Mapbox, or QGIS</li>
          </ol>
          
          <div className="mt-4">
            <h4 className="font-medium text-blue-900 mb-2">Expected Input Format:</h4>
            <p className="text-sm text-blue-800">
              Your JSON should contain an array of areas, each with an <code className="bg-blue-100 px-1 rounded">area_list</code> containing stations. 
              Each station should have a <code className="bg-blue-100 px-1 rounded">polygon</code> field with lat/long coordinates as a JSON string.
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Copied to clipboard!</span>
          </div>
        </div>
      )}
    </div>
  );
}
