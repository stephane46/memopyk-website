import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestGalleryVideo() {
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testGalleryVideo = async () => {
    setIsLoading(true);
    setTestResult("Testing GalleryVideo1.mp4...");

    try {
      // Test if GalleryVideo1.mp4 can be accessed through video proxy
      const response = await fetch('/api/video-proxy?filename=GalleryVideo1.mp4', {
        method: 'HEAD',
        headers: {
          'Range': 'bytes=0-'
        }
      });

      if (response.status === 206 || response.status === 200) {
        setTestResult(`✅ SUCCESS: GalleryVideo1.mp4 works in production! (Status: ${response.status})`);
      } else {
        setTestResult(`❌ FAILED: GalleryVideo1.mp4 blocked in production (Status: ${response.status})`);
      }
    } catch (error) {
      setTestResult(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gallery Video Production Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="mb-4">
            This test checks if GalleryVideo1.mp4 works through the video proxy in production.
          </p>
          
          <Button 
            onClick={testGalleryVideo}
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? "Testing..." : "Test GalleryVideo1.mp4"}
          </Button>
          
          {testResult && (
            <div className="p-4 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
          
          <div className="mt-6 text-sm text-gray-600">
            <h3 className="font-semibold mb-2">What this test tells us:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>✅ SUCCESS:</strong> Simple filenames bypass infrastructure blocks - we can update database safely</li>
              <li><strong>❌ FAILED:</strong> All gallery videos are blocked regardless of filename - need different approach</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}