import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface ContentKeyword {
  id: string;
  keyword: string;
  monthlySearches?: number;
  tier?: number;
}

interface KeywordDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyword: ContentKeyword;
}

export function KeywordDeleteDialog({ isOpen, onClose, keyword }: KeywordDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest(`/api/admin/content/keywords/${keyword.id}`, 'DELETE');

      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/keywords'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/keywords/stats'] });

      toast({
        title: 'Keyword deleted',
        description: `"${keyword.keyword}" has been deleted.`,
      });

      onClose();
    } catch (error) {
      console.error('Failed to delete keyword:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete keyword',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Keyword</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{keyword.keyword}"</strong>?
              </p>

              {keyword.monthlySearches && keyword.monthlySearches > 0 && (
                <p className="text-sm text-muted-foreground">
                  This keyword has {keyword.monthlySearches.toLocaleString()} monthly searches.
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Keyword'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
