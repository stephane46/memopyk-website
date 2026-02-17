import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, adminFetch } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, Trash2, Mail, ExternalLink, Search, Calendar, 
  FolderOpen, FileText, HardDrive, Clock, ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';

interface Submission {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  agency_code: string;
  language: string;
  folder_path: string;
  share_url: string;
  share_id: string;
  share_token: string;
  status: string;
  agency_email_sent: boolean;
  ngoc_email_sent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FolderStats {
  exists: boolean;
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  totalSizeMB: string;
  lastUpload: string | null;
  error?: string;
}

type SortField = 'name' | 'size' | 'date' | 'agency';
type SortDirection = 'asc' | 'desc';

export default function TravelUploadsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [folderStats, setFolderStats] = useState<Record<number, FolderStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);

  const { data: submissions = [], isLoading, refetch } = useQuery<Submission[]>({
    queryKey: ['/api/travel-upload/submissions'],
    queryFn: async () => {
      const res = await adminFetch('/api/travel-upload/submissions');
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    },
  });

  const uniqueAgencies = useMemo(() => {
    const agencies = new Set(submissions.map(s => s.agency_code));
    return Array.from(agencies).sort();
  }, [submissions]);

  const filteredAndSortedSubmissions = useMemo(() => {
    let filtered = [...submissions];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.first_name?.toLowerCase().includes(query) ||
        s.last_name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }
    
    if (agencyFilter && agencyFilter !== 'all') {
      filtered = filtered.filter(s => s.agency_code === agencyFilter);
    }
    
    if (dateRange.start) {
      filtered = filtered.filter(s => new Date(s.createdAt) >= new Date(dateRange.start));
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.createdAt) <= endDate);
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          break;
        case 'size':
          const sizeA = folderStats[a.id]?.totalSize || 0;
          const sizeB = folderStats[b.id]?.totalSize || 0;
          comparison = sizeA - sizeB;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'agency':
          comparison = a.agency_code.localeCompare(b.agency_code);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [submissions, searchQuery, agencyFilter, dateRange, sortField, sortDirection, folderStats]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/travel-upload/submissions/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel-upload/submissions'] });
      toast({
        title: 'Submission deleted',
        description: data.message,
      });
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/travel-upload/submissions/${id}/resend-email`, 'POST');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Email sent',
        description: 'Confirmation email has been resent successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const loadFolderStats = async () => {
    if (submissions.length === 0) return;
    
    setLoadingStats(true);
    try {
      const ids = submissions.map(s => s.id);
      const response = await apiRequest('/api/travel-upload/bulk-folder-stats', 'POST', { submissionIds: ids });
      const stats = await response.json();
      setFolderStats(stats);
    } catch (error) {
      toast({
        title: 'Error loading folder statistics',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatFrenchDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Travel Upload Submissions</h2>
        <p className="text-gray-600">Manage travel agency client upload requests and monitor folder usage</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Submissions ({filteredAndSortedSubmissions.length})</CardTitle>
              <CardDescription>All travel upload requests with Nextcloud folder statistics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadFolderStats}
                disabled={loadingStats || submissions.length === 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
                {loadingStats ? 'Loading...' : 'Refresh Stats'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All agencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agencies</SelectItem>
                {uniqueAgencies.map(agency => (
                  <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-[140px]"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-[140px]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading submissions...</div>
          ) : filteredAndSortedSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No submissions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">
                      <SortButton field="date" label="Date/Time" />
                    </th>
                    <th className="text-left p-3">
                      <SortButton field="name" label="Client Name" />
                    </th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">
                      <SortButton field="agency" label="Agency" />
                    </th>
                    <th className="text-left p-3">Share Link</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">
                      <SortButton field="size" label="Upload Status" />
                    </th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedSubmissions.map((submission) => {
                    const stats = folderStats[submission.id];
                    
                    return (
                      <tr key={submission.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-gray-900">{formatFrenchDateTime(submission.createdAt)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">
                            {submission.first_name} {submission.last_name}
                          </div>
                          {submission.phone && (
                            <div className="text-xs text-gray-500">{submission.phone}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <a href={`mailto:${submission.email}`} className="text-blue-600 hover:underline">
                            {submission.email}
                          </a>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{submission.agency_code}</Badge>
                        </td>
                        <td className="p-3">
                          {submission.share_url ? (
                            <a
                              href={submission.share_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </a>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-3">
                          {submission.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {stats ? (
                            stats.error ? (
                              <span className="text-red-500 text-xs">{stats.error}</span>
                            ) : !stats.exists ? (
                              <span className="text-gray-400 text-xs">Folder deleted</span>
                            ) : (
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="h-3 w-3 text-amber-600" />
                                  <span>{stats.totalFolders} folders</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 text-blue-600" />
                                  <span>{stats.totalFiles} files</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <HardDrive className="h-3 w-3 text-purple-600" />
                                  <span>{formatBytes(stats.totalSize)}</span>
                                </div>
                                {stats.lastUpload && (
                                  <div className="flex items-center gap-2 text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>Last: {formatFrenchDateTime(stats.lastUpload)}</span>
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={loadFolderStats}
                              disabled={loadingStats}
                              className="text-xs text-[#D67C4A] hover:text-[#c56b3a] hover:bg-orange-50 px-2 py-1 h-auto"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
                              {loadingStats ? 'Loading...' : 'Load Stats'}
                            </Button>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendEmailMutation.mutate(submission.id)}
                              disabled={resendEmailMutation.isPending}
                              title="Resend confirmation email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSubmissionToDelete(submission);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete submission"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Submission
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this submission?
            </DialogDescription>
          </DialogHeader>
          
          {submissionToDelete && (
            <div className="py-4 space-y-3">
              <div className="text-sm">
                <strong>Client:</strong> {submissionToDelete.first_name} {submissionToDelete.last_name}
              </div>
              <div className="text-sm">
                <strong>Email:</strong> {submissionToDelete.email}
              </div>
              <div className="text-sm">
                <strong>Folder Path:</strong> {submissionToDelete.folder_path}
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Important:</strong> This will only delete the submission record from the database. 
                    The Nextcloud folder at <code className="bg-amber-100 px-1 rounded">{submissionToDelete.folder_path}</code> will 
                    still exist and must be deleted manually from Nextcloud if needed.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submissionToDelete && deleteMutation.mutate(submissionToDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-[#D67C4A] hover:bg-[#c56b3a] text-white font-medium px-6 py-2"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
