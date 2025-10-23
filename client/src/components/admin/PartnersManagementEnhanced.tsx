import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Map, Search, ChevronLeft, ChevronRight, Pencil, Trash2, MapPin, Save, X, Building2, Package, Eye, Camera, Film, Video, Plus, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Upload } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PHOTO_FORMATS, FILM_FORMATS, VIDEO_CASSETTES, DELIVERY } from '@/../../shared/partnerFormats';

interface Partner {
  id: number;
  timestamp: string;
  partner_type: string;
  partner_name: string;
  contact_name: string;
  email: string;
  email_public: string;
  phone: string;
  phone_public: string;
  website: string;
  address: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  photo_formats?: string;
  other_photo?: string;
  film_formats?: string;
  other_film?: string;
  video_cassettes?: string;
  other_video?: string;
  delivery?: string;
  other_delivery?: string;
  public_description?: string;
  status: string;
  is_active: boolean;
  show_on_map: boolean;
  lat: number | null;
  lng: number | null;
  slug?: string;
  submitted_at: string;
}

interface PartnersResponse {
  partners: Partner[];
  total: number;
  page: number;
  totalPages: number;
}

export default function PartnersManagementEnhanced() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<Partial<Partner>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importTsvText, setImportTsvText] = useState('');
  const limit = 20;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortedPartners = (partners: Partner[]) => {
    if (!sortBy) return partners;
    
    return [...partners].sort((a, b) => {
      let aVal = a[sortBy as keyof Partner];
      let bVal = b[sortBy as keyof Partner];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const formatFrenchDateTime = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Approved': 'bg-green-100 text-green-800 border-green-200',
      'Pending': 'bg-[#FEF3E2] text-[#D67C4A] border-[#D67C4A]',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    );
  };

  const buildQueryKey = () => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString() 
    });
    if (search) params.append('search', search);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (typeFilter !== 'all') params.append('partner_type', typeFilter);
    return `/api/partners?${params.toString()}`;
  };

  const { data, isLoading } = useQuery<PartnersResponse>({
    queryKey: ['partners', page, search, statusFilter, typeFilter],
    queryFn: async () => {
      const response = await fetch(buildQueryKey());
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Partner> }) => {
      const response = await fetch(`/api/partners/${id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setEditingPartner(null);
      setEditData({});
      toast({ title: "Partner updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating partner", variant: "destructive" });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Partner>) => {
      const response = await fetch('/api/partners/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Create failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setIsAddingNew(false);
      setEditData({});
      toast({ title: "Partner created successfully" });
    },
    onError: () => {
      toast({ title: "Error creating partner", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/partners/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: "Partner deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting partner", variant: "destructive" });
    }
  });

  const quickUpdateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Partner> }) => {
      const res = await fetch(`/api/partners/${id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    }
  });

  const cycleStatus = (partnerId: number, currentStatus: string) => {
    const statusCycle = ['Pending', 'Approved', 'Rejected'];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    quickUpdateMutation.mutate({ id: partnerId, updates: { status: nextStatus } });
  };

  const toggleActive = (partnerId: number, currentValue: boolean) => {
    quickUpdateMutation.mutate({ id: partnerId, updates: { is_active: !currentValue } });
  };

  const toggleShowOnMap = (partnerId: number, currentValue: boolean) => {
    quickUpdateMutation.mutate({ id: partnerId, updates: { show_on_map: !currentValue } });
  };

  const importTsvMutation = useMutation({
    mutationFn: async (tsvText: string) => {
      const response = await fetch('/api/partners/import-tsv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tsvText })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setShowImportDialog(false);
      setImportTsvText('');
      toast({
        title: "Partners imported successfully",
        description: `${data.count} partner(s) added to the system`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Import failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });


  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setEditData(partner);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditData({
      partner_type: 'digitization',
      status: 'Pending',
      is_active: false,
      show_on_map: false,
      email_public: 'FALSE',
      phone_public: 'FALSE',
    });
  };

  const handleSaveEdit = () => {
    if (!editingPartner) return;
    updateMutation.mutate({ id: editingPartner.id, data: editData });
  };

  const handleSaveNew = () => {
    createMutation.mutate(editData);
  };

  return (
    <Card className="border-white/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Partner Management</CardTitle>
          <div className="flex gap-3">
            {/* Primary Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleAddNew}
                className="!bg-[#D67C4A] hover:!bg-[#c46d3f] !text-black font-medium !border-[#D67C4A]"
                size="sm"
                data-testid="button-add-partner"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                className="!bg-[#89BAD9] hover:!bg-[#7aa8c7] !text-black font-medium !border-[#89BAD9]"
                size="sm"
                data-testid="button-import-tsv"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import TSV
              </Button>
            </div>

            {/* Separator */}
            <div className="w-px bg-gray-300 h-8 self-center"></div>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => window.open('/fr-FR/annuaire-pro', '_blank')}
                className="!bg-[#2A4759] hover:!bg-[#1f3a4a] !text-white font-medium !border-[#2A4759]"
                size="sm"
                data-testid="button-view-map"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Map
              </Button>
              <Button
                onClick={() => window.open('/api/partners/download', '_blank')}
                className="!bg-[#2A4759] hover:!bg-[#1f3a4a] !text-white font-medium !border-[#2A4759]"
                size="sm"
                data-testid="button-download-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              data-testid="input-search-partners"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900" data-testid="select-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="digitization">Digitization</SelectItem>
              <SelectItem value="restoration">Restoration</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Partners Table */}
        <div className="rounded-md border border-gray-300 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-gray-50">
                <TableHead 
                  className="text-gray-700 font-semibold cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('submitted_at')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortBy === 'submitted_at' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    {sortBy !== 'submitted_at' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-gray-700 font-semibold cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('partner_name')}
                >
                  <div className="flex items-center gap-1">
                    Partner
                    {sortBy === 'partner_name' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    {sortBy !== 'partner_name' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-gray-700 font-semibold cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('partner_type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortBy === 'partner_type' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    {sortBy !== 'partner_type' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">Contact</TableHead>
                <TableHead 
                  className="text-gray-700 font-semibold cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center gap-1">
                    Location
                    {sortBy === 'city' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    {sortBy !== 'city' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-gray-700 font-semibold cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    {sortBy !== 'status' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">Active</TableHead>
                <TableHead className="text-gray-700 font-semibold">Show on Map</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    Loading partners...
                  </TableCell>
                </TableRow>
              ) : !data?.partners.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                getSortedPartners(data.partners).map((partner) => (
                  <TableRow key={partner.id} className="border-gray-200 hover:bg-gray-50">
                    <TableCell className="text-gray-700 text-sm whitespace-nowrap">
                      {formatFrenchDateTime(partner.timestamp)}
                    </TableCell>
                    <TableCell className="text-gray-900 font-medium">
                      {partner.partner_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs text-gray-700 border-gray-300">
                        {partner.partner_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm">
                      <div>{partner.contact_name}</div>
                      <div className="text-xs text-gray-500">{partner.email}</div>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm">
                      <div>{partner.city}</div>
                      <div className="text-xs text-gray-500">{partner.country}</div>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => cycleStatus(partner.id, partner.status)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        data-testid={`button-cycle-status-${partner.id}`}
                      >
                        {getStatusBadge(partner.status)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => toggleActive(partner.id, partner.is_active)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        data-testid={`button-toggle-active-${partner.id}`}
                      >
                        {partner.is_active ? (
                          <Badge className="text-xs !bg-green-100 !text-green-700 !border-green-300 !important">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs !bg-gray-100 !text-gray-600 !border-gray-300 !important">
                            Inactive
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => toggleShowOnMap(partner.id, partner.show_on_map)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        data-testid={`button-toggle-map-${partner.id}`}
                      >
                        {partner.show_on_map ? (
                          <Badge className="text-xs !bg-[#89BAD9] !text-white !border-[#89BAD9] !important">
                            <MapPin className="h-3 w-3 mr-1" />
                            On Map
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs !bg-gray-100 !text-gray-600 !border-gray-300 !important">
                            <Eye className="h-3 w-3 mr-1 opacity-50" />
                            Hidden
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(partner)}
                          className="h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          data-testid={`button-edit-${partner.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(partner.id)}
                          disabled={deleteMutation.isPending}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${partner.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} partners
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-white border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm text-gray-700 px-3">
                Page {page} of {data.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="bg-white border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit/Add Partner Modal */}
      <Dialog open={!!editingPartner || isAddingNew} onOpenChange={(open) => {
        if (!open) {
          setEditingPartner(null);
          setIsAddingNew(false);
          setEditData({});
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl">
              {isAddingNew ? 'Add New Partner' : `Edit Partner: ${editingPartner?.partner_name}`}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4 bg-gray-200">
              <TabsTrigger 
                value="basic" 
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=inactive]:text-gray-600"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger 
                value="location" 
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=inactive]:text-gray-600"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Location
              </TabsTrigger>
              <TabsTrigger 
                value="services" 
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=inactive]:text-gray-600"
              >
                <Package className="w-4 h-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger 
                value="visibility" 
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=inactive]:text-gray-600"
              >
                <Eye className="w-4 h-4 mr-2" />
                Visibility
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Partner Type</Label>
                  <Select 
                    value={editData.partner_type || ''} 
                    onValueChange={(val) => setEditData({ ...editData, partner_type: val })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digitization">Digitization</SelectItem>
                      <SelectItem value="restoration">Restoration</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Status</Label>
                  <Select 
                    value={editData.status || ''} 
                    onValueChange={(val) => setEditData({ ...editData, status: val })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Partner Name</Label>
                  <Input
                    value={editData.partner_name || ''}
                    onChange={(e) => setEditData({ ...editData, partner_name: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Contact Name</Label>
                  <Input
                    value={editData.contact_name || ''}
                    onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Email</Label>
                  <Input
                    value={editData.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <Checkbox
                      checked={editData.email_public === 'TRUE'}
                      onCheckedChange={(checked) => setEditData({ ...editData, email_public: checked ? 'TRUE' : 'FALSE' })}
                    />
                    Show email publicly
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Phone</Label>
                  <Input
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <Checkbox
                      checked={editData.phone_public === 'TRUE'}
                      onCheckedChange={(checked) => setEditData({ ...editData, phone_public: checked ? 'TRUE' : 'FALSE' })}
                    />
                    Show phone publicly
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Website</Label>
                <Input
                  value={editData.website || ''}
                  onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Public Description</Label>
                <Textarea
                  value={editData.public_description || ''}
                  onChange={(e) => setEditData({ ...editData, public_description: e.target.value })}
                  maxLength={500}
                  className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                  placeholder="Description visible on partner directory"
                />
                <div className="text-sm text-gray-500 text-right">
                  {500 - (editData.public_description?.length || 0)} caractères restants
                </div>
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Address</Label>
                <Input
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Address Line 2</Label>
                <Input
                  value={editData.address_line2 || ''}
                  onChange={(e) => setEditData({ ...editData, address_line2: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">City</Label>
                  <Input
                    value={editData.city || ''}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Postal Code</Label>
                  <Input
                    value={editData.postal_code || ''}
                    onChange={(e) => setEditData({ ...editData, postal_code: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Country</Label>
                <Input
                  value={editData.country || ''}
                  onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editData.lat || ''}
                    onChange={(e) => setEditData({ ...editData, lat: parseFloat(e.target.value) || null })}
                    onPaste={(e) => {
                      const pastedText = e.clipboardData.getData('text');
                      const match = pastedText.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
                      if (match) {
                        e.preventDefault();
                        setEditData({ ...editData, lat: parseFloat(match[1]) });
                      }
                    }}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editData.lng || ''}
                    onChange={(e) => setEditData({ ...editData, lng: parseFloat(e.target.value) || null })}
                    onPaste={(e) => {
                      const pastedText = e.clipboardData.getData('text');
                      const match = pastedText.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
                      if (match) {
                        e.preventDefault();
                        setEditData({ ...editData, lng: parseFloat(match[2]) });
                      }
                    }}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-6 py-4">
              {/* Photo Formats */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#D67C4A]" />
                  <Label className="text-base font-semibold text-gray-900">Photo Formats</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-7">
                  {PHOTO_FORMATS.map((format) => {
                    const selected = editData.photo_formats?.split(',').map(f => f.trim()).includes(format.v) || false;
                    return (
                      <div key={format.v} className="flex items-center space-x-2">
                        <Checkbox
                          id={`photo-${format.v}`}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const currentFormats = editData.photo_formats?.split(',').map(f => f.trim()).filter(f => f) || [];
                            const newFormats = checked
                              ? [...currentFormats, format.v]
                              : currentFormats.filter(f => f !== format.v);
                            setEditData({ ...editData, photo_formats: newFormats.join(', ') });
                          }}
                        />
                        <label htmlFor={`photo-${format.v}`} className="text-sm text-gray-800 cursor-pointer">
                          {format.fr}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Film Formats */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#D67C4A]" />
                  <Label className="text-base font-semibold text-gray-900">Film Formats</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-7">
                  {FILM_FORMATS.map((format) => {
                    const selected = editData.film_formats?.split(',').map(f => f.trim()).includes(format.v) || false;
                    return (
                      <div key={format.v} className="flex items-center space-x-2">
                        <Checkbox
                          id={`film-${format.v}`}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const currentFormats = editData.film_formats?.split(',').map(f => f.trim()).filter(f => f) || [];
                            const newFormats = checked
                              ? [...currentFormats, format.v]
                              : currentFormats.filter(f => f !== format.v);
                            setEditData({ ...editData, film_formats: newFormats.join(', ') });
                          }}
                        />
                        <label htmlFor={`film-${format.v}`} className="text-sm text-gray-800 cursor-pointer">
                          {format.fr}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Video Formats */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#D67C4A]" />
                  <Label className="text-base font-semibold text-gray-900">Video Formats</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-7">
                  {VIDEO_CASSETTES.map((format) => {
                    const selected = editData.video_cassettes?.split(',').map(f => f.trim()).includes(format.v) || false;
                    return (
                      <div key={format.v} className="flex items-center space-x-2">
                        <Checkbox
                          id={`video-${format.v}`}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const currentFormats = editData.video_cassettes?.split(',').map(f => f.trim()).filter(f => f) || [];
                            const newFormats = checked
                              ? [...currentFormats, format.v]
                              : currentFormats.filter(f => f !== format.v);
                            setEditData({ ...editData, video_cassettes: newFormats.join(', ') });
                          }}
                        />
                        <label htmlFor={`video-${format.v}`} className="text-sm text-gray-800 cursor-pointer">
                          {format.fr}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other Format Fields */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <Label className="text-base font-semibold text-gray-900">Other Formats (Custom)</Label>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Other Photo Formats</Label>
                  <Input
                    value={editData.other_photo || ''}
                    onChange={(e) => setEditData({ ...editData, other_photo: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Custom photo formats"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Other Film Formats</Label>
                  <Input
                    value={editData.other_film || ''}
                    onChange={(e) => setEditData({ ...editData, other_film: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Custom film formats"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Other Video Formats</Label>
                  <Input
                    value={editData.other_video || ''}
                    onChange={(e) => setEditData({ ...editData, other_video: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Custom video formats"
                  />
                </div>
              </div>

              {/* Delivery Methods */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <Label className="text-base font-semibold text-gray-900">Delivery Methods</Label>
                <div className="grid grid-cols-2 gap-3 pl-7">
                  {DELIVERY.map((method) => {
                    const selected = editData.delivery?.split(',').map(d => d.trim()).includes(method.v) || false;
                    return (
                      <div key={method.v} className="flex items-center space-x-2">
                        <Checkbox
                          id={`delivery-${method.v}`}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const currentMethods = editData.delivery?.split(',').map(d => d.trim()).filter(d => d) || [];
                            const newMethods = checked
                              ? [...currentMethods, method.v]
                              : currentMethods.filter(d => d !== method.v);
                            setEditData({ ...editData, delivery: newMethods.join(', ') });
                          }}
                        />
                        <label htmlFor={`delivery-${method.v}`} className="text-sm text-gray-800 cursor-pointer">
                          {method.fr}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-gray-700">Other Delivery Methods</Label>
                  <Input
                    value={editData.other_delivery || ''}
                    onChange={(e) => setEditData({ ...editData, other_delivery: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Custom delivery methods"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Visibility Tab */}
            <TabsContent value="visibility" className="space-y-4 py-4">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={editData.is_active || false}
                    onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-gray-900 font-medium block">Active</span>
                    <span className="text-sm text-gray-500">Partner is active in the directory</span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={editData.show_on_map || false}
                    onChange={(e) => setEditData({ ...editData, show_on_map: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-gray-900 font-medium block">Show on Map</span>
                    <span className="text-sm text-gray-500">Display this partner on the public map</span>
                  </div>
                </label>

                <div className="space-y-2 pt-4">
                  <Label className="text-gray-700">URL Slug</Label>
                  <Input
                    value={editData.slug || ''}
                    onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="partner-url-slug"
                  />
                  <p className="text-xs text-gray-500">Optional: Custom URL identifier for partner page</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setEditingPartner(null);
                setIsAddingNew(false);
                setEditData({});
              }}
              className="bg-white border-2 border-gray-400 text-gray-900 hover:bg-gray-100 font-medium"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={isAddingNew ? handleSaveNew : handleSaveEdit}
              disabled={isAddingNew ? createMutation.isPending : updateMutation.isPending}
              className="bg-[#D67C4A] hover:bg-[#c46d3f] text-black font-medium border-2 border-[#D67C4A] disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isAddingNew 
                ? (createMutation.isPending ? 'Creating...' : 'Create Partner')
                : (updateMutation.isPending ? 'Saving...' : 'Save Changes')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import TSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#D67C4A]" />
              Import Partners from TSV
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Paste TSV Data</Label>
              <Textarea
                value={importTsvText}
                onChange={(e) => setImportTsvText(e.target.value)}
                placeholder="Paste your TSV data here (tab-separated values)..."
                className="min-h-[300px] font-mono text-sm bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-500">
                Copy the TSV rows from your spreadsheet and paste them here. Include the header row with column names.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium mb-1">Expected TSV Format:</p>
              <p className="text-xs text-blue-700 font-mono">
                Timestamp → Partner Name → Email → Email_Public → Phone → Website → Address → ...
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportTsvText('');
              }}
              className="bg-white border-2 border-gray-400 text-gray-900 hover:bg-gray-100 font-medium"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => importTsvMutation.mutate(importTsvText)}
              disabled={importTsvMutation.isPending || !importTsvText.trim()}
              className="bg-[#D67C4A] hover:bg-[#c46d3f] text-black font-medium border-2 border-[#D67C4A] disabled:opacity-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importTsvMutation.isPending ? 'Importing...' : 'Import Partners'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
