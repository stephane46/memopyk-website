export default function GV2Page() {
  const VERSION = "v1.0.1754933860.GV2_CACHING_TEST";
  
  console.log(`🎬 GV2 PAGE ${VERSION} - VIDEO CACHING COMPARISON TEST`);
  console.log('   - Section 1: Direct streaming (no cache)');
  console.log('   - Section 2: Cached streaming test');
  console.log('   - Hero Video: VideoHero1.mp4');
  console.log('   - Pom Video: PomGalleryC.mp4');
  
  return (
    <div className="min-h-screen bg-white p-8">
      {/* Version Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">GV2 - Video Caching Test</h1>
        <p className="text-sm text-gray-600">{VERSION}</p>
      </div>
      
      {/* Section 1: Direct Streaming */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Section 1: Direct Streaming (No Cache)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hero Video Frame */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-600 mb-3">Hero Video (Direct)</h3>
            <video
              controls
              muted
              className="w-full rounded border-2 border-gray-300"
              style={{ maxHeight: '300px' }}
              onLoadStart={() => console.log('🎬 DIRECT HERO: loadstart')}
              onLoadedData={() => console.log('🎬 DIRECT HERO: loadeddata')}
              onCanPlay={() => console.log('🎬 DIRECT HERO: canplay')}
              onError={(e) => console.error('🎬 DIRECT HERO ERROR:', e)}
            >
              <source src="/api/video-proxy?filename=VideoHero1.mp4" type="video/mp4" />
            </video>
          </div>
          
          {/* Pom Video Frame */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-600 mb-3">Pom Video (Direct)</h3>
            <video
              controls
              muted
              className="w-full rounded border-2 border-gray-300"
              style={{ maxHeight: '300px' }}
              onLoadStart={() => console.log('🎬 DIRECT POM: loadstart')}
              onLoadedData={() => console.log('🎬 DIRECT POM: loadeddata')}
              onCanPlay={() => console.log('🎬 DIRECT POM: canplay')}
              onError={(e) => console.error('🎬 DIRECT POM ERROR:', e)}
            >
              <source src="/api/video-proxy?filename=PomGalleryC.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>
      
      {/* Section 2: Cached Streaming */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Section 2: Cached Streaming Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hero Video Cached Frame */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-700 mb-3">Hero Video (Cached)</h3>
            <video
              controls
              muted
              className="w-full rounded border-2 border-blue-300"
              style={{ maxHeight: '300px' }}
              onLoadStart={() => console.log('🎬 CACHED HERO: loadstart')}
              onLoadedData={() => console.log('🎬 CACHED HERO: loadeddata')}
              onCanPlay={() => console.log('🎬 CACHED HERO: canplay')}
              onError={(e) => console.error('🎬 CACHED HERO ERROR:', e)}
            >
              <source src="/api/video-proxy?filename=VideoHero1.mp4&cache=force" type="video/mp4" />
            </video>
          </div>
          
          {/* Pom Video Cached Frame */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-700 mb-3">Pom Video (Cached)</h3>
            <video
              controls
              muted
              className="w-full rounded border-2 border-blue-300"
              style={{ maxHeight: '300px' }}
              onLoadStart={() => console.log('🎬 CACHED POM: loadstart')}
              onLoadedData={() => console.log('🎬 CACHED POM: loadeddata')}
              onCanPlay={() => console.log('🎬 CACHED POM: canplay')}
              onError={(e) => console.error('🎬 CACHED POM ERROR:', e)}
            >
              <source src="/api/video-proxy?filename=PomGalleryC.mp4&cache=force" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>
      
      {/* Status Information */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Test Information:</h3>
        <ul className="space-y-1">
          <li>• Section 1 uses normal video proxy logic</li>
          <li>• Section 2 uses cache=force parameter to test caching</li>
          <li>• Check browser console for detailed loading logs</li>
          <li>• Hero videos should cache, gallery videos should stream directly</li>
        </ul>
      </div>
    </div>
  );
}