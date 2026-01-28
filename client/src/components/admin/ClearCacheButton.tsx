import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ClearCacheButtonProps {
  className?: string;
  onCacheCleared?: () => void;
}

export function ClearCacheButton({ className, onCacheCleared }: ClearCacheButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClear() {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch("/api/ga4/cache", { 
        method: "DELETE" 
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setMessage(`Cache cleared (${data.deletedEntries} entries)`);
        
        // Notify parent component
        onCacheCleared?.();
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage("Failed to clear cache");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      setMessage("Failed to clear cache");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClear}
        disabled={loading}
        variant="destructive"
        size="sm"
        className={className}
        data-testid="button-clear-cache"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        {loading ? "Clearing..." : "Clear Cache"}
      </Button>
      
      {message && (
        <span 
          className="text-sm text-muted-foreground"
          data-testid="text-cache-message"
        >
          {message}
        </span>
      )}
    </div>
  );
}

export default ClearCacheButton;