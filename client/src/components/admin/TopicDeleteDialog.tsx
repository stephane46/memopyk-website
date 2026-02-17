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
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

interface ContentTopic {
  id: string;
  title: string;
  postCount?: number;
  timesGenerated?: number;
}

interface TopicDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topic: ContentTopic;
}

export function TopicDeleteDialog({ isOpen, onClose, topic }: TopicDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest(`/api/admin/content/topics/${topic.id}`, 'DELETE');

      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/topics'] });

      toast({
        title: 'Topic deleted',
        description: `"${topic.title}" has been deleted.`,
      });

      onClose();
    } catch (error) {
      console.error('Failed to delete topic:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete topic',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const postCount = topic.postCount || 0;
  const timesGenerated = topic.timesGenerated || 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Topic</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{topic.title}"</strong>?
              </p>

              {postCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This topic has <strong>{postCount} linked post{postCount !== 1 ? 's' : ''}</strong>.
                    They will become unlinked but won't be deleted.
                  </p>
                </div>
              )}

              {timesGenerated > 0 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This topic has been used to generate content <strong>{timesGenerated} time{timesGenerated !== 1 ? 's' : ''}</strong>.
                    This generation history will be lost.
                  </p>
                </div>
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
              'Delete Topic'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
