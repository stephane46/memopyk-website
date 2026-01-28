export default function GalleryVideoTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Video - More Prominent */}
      <div className="relative h-screen bg-red-500 overflow-hidden border-4 border-yellow-400">
        <div className="absolute top-0 left-0 bg-green-500 text-white p-4 z-50">
          HERO VIDEO SECTION
        </div>
        <video
          className="w-full h-full object-cover"
          controls
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => console.error('Hero video failed to load:', e)}
          onLoadedData={() => console.log('Hero video loaded successfully')}
          onCanPlay={() => console.log('Hero video can play')}
        >
          <source src="/api/video-proxy?filename=VideoHero1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white bg-black/50 p-4 rounded">Gallery Video Test - HERO</h1>
        </div>
      </div>
      
      {/* Simple POM Video Player */}
      <div className="py-8 flex justify-center bg-blue-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">POM VIDEO BELOW</h2>
          <video
            src="/api/video-proxy?filename=PomGalleryC.mp4"
            controls
            autoPlay
            muted
            style={{ width: '100%', maxWidth: '800px' }}
          />
        </div>
      </div>
    </div>
  );
}