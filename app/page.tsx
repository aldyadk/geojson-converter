'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getLocale, type Locale } from '../lib/locales';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [inputData, setInputData] = useState('');
  const [outputData, setOutputData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeMarkers, setIncludeMarkers] = useState(false);
  const [markers, setMarkers] = useState<Array<{lat: string, lng: string, name: string}>>([]);
  const [showToast, setShowToast] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const t = getLocale(locale);

  // Initialize from URL parameters
  useEffect(() => {
    const urlLocale = searchParams.get('lang') as Locale;
    const urlTheme = searchParams.get('theme');
    
    if (urlLocale && (urlLocale === 'en' || urlLocale === 'id')) {
      setLocale(urlLocale);
    }
    
    if (urlTheme === 'dark') {
      setIsDarkMode(true);
    } else if (urlTheme === 'light') {
      setIsDarkMode(false);
    }
  }, [searchParams]);

  // Update URL when locale or theme changes
  const updateUrl = (newLocale: Locale, newTheme: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', newLocale);
    params.set('theme', newTheme ? 'dark' : 'light');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleConvert = async () => {
    if (!inputData.trim()) {
      setError(t.pleaseEnterJsonData);
      return;
    }

    setLoading(true);
    setError('');
    setOutputData('');

    try {
      // Validate JSON
      const parsedData = JSON.parse(inputData);
      
      // Validate markers if includeMarkers is enabled
      if (includeMarkers && markers.length > 0) {
        for (let i = 0; i < markers.length; i++) {
          const marker = markers[i];
          const lat = parseFloat(marker.lat);
          const lng = parseFloat(marker.lng);
          
          if (!marker.lat || !marker.lng || isNaN(lat) || isNaN(lng)) {
            throw new Error(`Marker ${i + 1}: Please provide valid latitude and longitude values`);
          }
          
          if (lat < -90 || lat > 90) {
            throw new Error(`Marker ${i + 1}: Latitude must be between -90 and 90 degrees`);
          }
          
          if (lng < -180 || lng > 180) {
            throw new Error(`Marker ${i + 1}: Longitude must be between -180 and 180 degrees`);
          }
        }
      }
      
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
        throw new Error(errorData.error || t.failedToConvertData);
      }

      const geojson = await response.json();
      setOutputData(JSON.stringify(geojson, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.anErrorOccurred);
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
    // Randomly choose between simple array format and complex nested structure
    const useSimpleFormat = Math.random() < 0.5;
    
    if (useSimpleFormat) {
      // Simple array format
      setInputData(`[
  {
    "name": "Jakarta Timur Area (simple array format)",
    "polygon": [
      {
        "lat": -6.1649059095488115,
        "long": 106.8687362055075
      },
      {
        "lat": -6.167636600868331,
        "long": 106.97722619574188
      },
      {
        "lat": -6.247844358254605,
        "long": 106.9456405023825
      },
      {
        "lat": -6.282995382772532,
        "long": 106.95782846014617
      },
      {
        "lat": -6.305176847085295,
        "long": 106.93019097845672
      },
      {
        "lat": -6.303129367000778,
        "long": 106.885215697695
      },
      {
        "lat": -6.2195170568553335,
        "long": 106.86736291449188
      }
    ]
  },
  {
    "name": "Sample Feature (lat/lng format)",
    "polygon": "[{\\"lat\\":-6.2428,\\"lng\\":106.8628},{\\"lat\\":-6.2434,\\"lng\\":106.8628},{\\"lat\\":-6.2434,\\"lng\\":106.8640},{\\"lat\\":-6.2428,\\"lng\\":106.8640}]"
  }
]`);
    } else {
      // Complex nested structure format
      setInputData(`[
  {
    "area_list": [
      {
        "name": "Feature 1 (lat/long format)",
        "polygon": "[{\\"lat\\":-6.242799927901021,\\"long\\":106.86279925611093},{\\"lat\\":-6.243423842559002,\\"long\\":106.86278852727487},{\\"lat\\":-6.243439840360971,\\"long\\":106.86401161458566},{\\"lat\\":-6.243605150952711,\\"long\\":106.86500403192117},{\\"lat\\":-6.243722468115187,\\"long\\":106.86544927861765},{\\"lat\\":-6.243146547247209,\\"long\\":106.86548146512582},{\\"lat\\":-6.242959906089307,\\"long\\":106.86468753125742}]"
      },
      {
        "name": "Feature 2 (lat/lng format)",
        "polygon": "[{\\"lat\\":-6.2428,\\"lng\\":106.8628},{\\"lat\\":-6.2434,\\"lng\\":106.8628},{\\"lat\\":-6.2434,\\"lng\\":106.8640},{\\"lat\\":-6.2428,\\"lng\\":106.8640}]"
      }
    ]
  },
  {
    "area_list": [
      {
        "name": "Feature 3 (latitude/longitude format)",
        "polygon": "[{\\"latitude\\":-6.2410762828289155,\\"longitude\\":106.79954744427533},{\\"latitude\\":-6.24114027432065,\\"longitude\\":106.80026627629132},{\\"latitude\\":-6.237588734710916,\\"longitude\\":106.80005169957013},{\\"latitude\\":-6.236656851525913,\\"longitude\\":106.80003426521154},{\\"latitude\\":-6.236761505156429,\\"longitude\\":106.797461356214},{\\"latitude\\":-6.237410090566302,\\"longitude\\":106.79735607951017},{\\"latitude\\":-6.2410096250167175,\\"longitude\\":106.7973614439282}]"
      },
      {
        "name": "Feature 4 (lat/lon format)",
        "polygon": "[{\\"lat\\":-6.214703446881995,\\"lon\\":106.81502263030623},{\\"lat\\":-6.213012917242654,\\"lon\\":106.81781212768172},{\\"lat\\":-6.215499380486178,\\"lon\\":106.81991095623587},{\\"lat\\":-6.21786184298636,\\"lon\\":106.81735078773116}]"
      }
    ]
  },
  {
    "area_list": [
      {
        "name": "Feature 5 (mixed format example)",
        "polygon": "[{\\"lat\\":-6.144707878120549,\\"long\\":106.80058687353063},{\\"lat\\":-6.144689210527343,\\"lng\\":106.80098115825582},{\\"latitude\\":-6.145465248492736,\\"longitude\\":106.80101066255499},{\\"lat\\":-6.145459914902338,\\"lon\\":106.80064588212896}]"
      }
    ]
  },
  {
    "area_list": [
      {
        "name": "Feature 6 (real JSON array format)",
        "polygon": [
          {
            "lat": -6.1649059095488115,
            "long": 106.8687362055075
          },
          {
            "lat": -6.167636600868331,
            "long": 106.97722619574188
          },
          {
            "lat": -6.247844358254605,
            "long": 106.9456405023825
          },
          {
            "lat": -6.282995382772532,
            "long": 106.95782846014617
          },
          {
            "lat": -6.305176847085295,
            "long": 106.93019097845672
          },
          {
            "lat": -6.303129367000778,
            "long": 106.885215697695
          },
          {
            "lat": -6.2195170568553335,
            "long": 106.86736291449188
          }
        ]
      }
    ]
  }
]`);
    }
  };

  return (
    <div className={`min-h-screen py-8 relative transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <h1 className={`text-4xl font-bold transition-colors duration-200 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {t.title}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLocale('en');
                  updateUrl('en', isDarkMode);
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  locale === 'en' 
                    ? 'bg-blue-600 text-white' 
                    : isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  setLocale('id');
                  updateUrl('id', isDarkMode);
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  locale === 'id' 
                    ? 'bg-blue-600 text-white' 
                    : isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => {
                  const newTheme = !isDarkMode;
                  setIsDarkMode(newTheme);
                  updateUrl(locale, newTheme);
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isDarkMode 
                    ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' 
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
          <p className={`text-lg max-w-2xl mx-auto transition-colors duration-200 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {t.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-200 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold transition-colors duration-200 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {t.inputData}
              </h2>
              <button
                onClick={handleLoadExample}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {t.loadExample}
              </button>
            </div>
            
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder={t.placeholderInput}
              className={`w-full h-96 p-4 border rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
            />
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeMarkers"
                  checked={includeMarkers}
                  onChange={(e) => setIncludeMarkers(e.target.checked)}
                  className={`rounded text-blue-600 focus:ring-blue-500 transition-colors duration-200 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300'
                  }`}
                />
                <label 
                  htmlFor="includeMarkers"
                  className={`text-sm cursor-pointer transition-colors duration-200 ${
                    isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {t.includeCustomMarker}
                </label>
              </div>
              
              {includeMarkers && (
                <div className={`p-4 rounded-md space-y-3 transition-colors duration-200 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`text-sm font-medium transition-colors duration-200 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {t.customMarkers}
                    </h3>
                    <button
                      type="button"
                      onClick={addMarker}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        isDarkMode 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {t.addMarker}
                    </button>
                  </div>
                  
                  {markers.length === 0 && (
                    <p className={`text-xs text-center py-2 transition-colors duration-200 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {t.noMarkersYet}
                    </p>
                  )}
                  
                  {markers.map((marker, index) => (
                    <div key={index} className={`p-3 rounded-md border space-y-3 transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-medium transition-colors duration-200 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {t.marker} {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMarker(index)}
                          className="text-red-500 hover:text-red-700 text-xs transition-colors duration-200"
                        >
                          {t.remove}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-medium mb-1 transition-colors duration-200 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {t.latitude}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={marker.lat}
                            onChange={(e) => updateMarker(index, 'lat', e.target.value)}
                            placeholder={t.placeholderLatitude}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                              isDarkMode 
                                ? 'border-gray-500 bg-gray-700 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-medium mb-1 transition-colors duration-200 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {t.longitude}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={marker.lng}
                            onChange={(e) => updateMarker(index, 'lng', e.target.value)}
                            placeholder={t.placeholderLongitude}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                              isDarkMode 
                                ? 'border-gray-500 bg-gray-700 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 transition-colors duration-200 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {t.markerName}
                        </label>
                        <input
                          type="text"
                          value={marker.name}
                          onChange={(e) => updateMarker(index, 'name', e.target.value)}
                          placeholder={t.placeholderMarkerName}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                            isDarkMode 
                              ? 'border-gray-500 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                          }`}
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? t.converting : t.convertToGeoJSON}
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-200 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold transition-colors duration-200 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {t.geojsonOutput}
              </h2>
              {outputData && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      isDarkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {t.copy}
                  </button>
                  <button
                    onClick={handleDownload}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      isDarkMode 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {t.download}
                  </button>
                </div>
              )}
            </div>
            
            <textarea
              value={outputData}
              readOnly
              placeholder={t.placeholderOutput}
              className={`w-full h-96 p-4 border rounded-md font-mono text-sm resize-none transition-colors duration-200 ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mt-6 border rounded-md p-4 transition-colors duration-200 ${
            isDarkMode 
              ? 'bg-red-900 border-red-700' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium transition-colors duration-200 ${
                  isDarkMode ? 'text-red-300' : 'text-red-800'
                }`}>
                  {t.error}
                </h3>
                <div className={`mt-2 text-sm transition-colors duration-200 ${
                  isDarkMode ? 'text-red-400' : 'text-red-700'
                }`}>
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className={`mt-8 border rounded-md p-6 transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-blue-900 border-blue-700' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h3 className={`text-lg font-medium mb-3 transition-colors duration-200 ${
            isDarkMode ? 'text-blue-300' : 'text-blue-900'
          }`}>
            {t.howToUse}
          </h3>
          <ol className={`list-decimal list-inside space-y-2 transition-colors duration-200 ${
            isDarkMode ? 'text-blue-200' : 'text-blue-800'
          }`}>
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
            <li>{t.step4}</li>
          </ol>
          
          <div className="mt-4">
            <h4 className={`font-medium mb-2 transition-colors duration-200 ${
              isDarkMode ? 'text-blue-300' : 'text-blue-900'
            }`}>
              {t.expectedInputFormat}
            </h4>
            <p className={`text-sm transition-colors duration-200 ${
              isDarkMode ? 'text-blue-200' : 'text-blue-800'
            }`}>
              {t.expectedInputDescription}
            </p>
            
            <div className="mt-3">
              <h5 className={`font-medium mb-2 transition-colors duration-200 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-900'
              }`}>
                {t.supportedCoordinateFormats}
              </h5>
              <div className={`text-sm space-y-1 font-mono transition-colors duration-200 ${
                isDarkMode ? 'text-blue-200' : 'text-blue-800'
              }`}>
                <div>{t.coordinateFormat1}</div>
                <div>{t.coordinateFormat2}</div>
                <div>{t.coordinateFormat3}</div>
                <div>{t.coordinateFormat4}</div>
              </div>
            </div>
            
            <div className="mt-3">
              <h5 className={`font-medium mb-2 transition-colors duration-200 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-900'
              }`}>
                {t.polygonFormatSupport}
              </h5>
              <div className={`text-sm space-y-1 font-mono transition-colors duration-200 ${
                isDarkMode ? 'text-blue-200' : 'text-blue-800'
              }`}>
                <div>{t.polygonFormat1}</div>
                <div>{t.polygonFormat2}</div>
              </div>
            </div>
            
            <div className="mt-3">
              <h5 className={`font-medium mb-2 transition-colors duration-200 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-900'
              }`}>
                {t.dataStructureSupport}
              </h5>
              <div className={`text-sm space-y-1 font-mono transition-colors duration-200 ${
                isDarkMode ? 'text-blue-200' : 'text-blue-800'
              }`}>
                <div>{t.dataStructure1}</div>
                <div>{t.dataStructure2}</div>
              </div>
            </div>
            
            <div className="mt-3">
              <h5 className={`font-medium mb-2 transition-colors duration-200 ${
                isDarkMode ? 'text-red-300' : 'text-red-900'
              }`}>
                {t.requiredFields}
              </h5>
              <div className={`text-sm font-medium transition-colors duration-200 ${
                isDarkMode ? 'text-red-200' : 'text-red-800'
              }`}>
                {t.requiredFieldsNote}
              </div>
            </div>
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
            <span className="font-medium">{t.copiedToClipboard}</span>
          </div>
        </div>
      )}
    </div>
  );
}
