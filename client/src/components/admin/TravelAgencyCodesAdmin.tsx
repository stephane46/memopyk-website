import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, adminFetch } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, RefreshCw, Building2 } from 'lucide-react';

interface AgencyCode {
  id: number;
  agency_name: string;
  agency_code: string;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface FormData {
  agencyName: string;
  agencyCode: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
}

const defaultFormData: FormData = {
  agencyName: '',
  agencyCode: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
  isActive: true
};

export default function TravelAgencyCodesAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<AgencyCode | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  const { data: agencyCodes = [], isLoading, refetch } = useQuery<AgencyCode[]>({
    queryKey: ['/api/travel-agency-codes'],
    queryFn: async () => {
      const res = await adminFetch('/api/travel-agency-codes');
      if (!res.ok) throw new Error('Failed to fetch agency codes');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('/api/travel-agency-codes', 'POST', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel-agency-codes'] });
      setCreateDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: 'Agency code created', description: 'The agency code has been added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await apiRequest(`/api/travel-agency-codes/${id}`, 'PATCH', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel-agency-codes'] });
      setEditDialogOpen(false);
      setSelectedCode(null);
      toast({ title: 'Agency code updated', description: 'The agency code has been updated successfully.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update agency code', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/travel-agency-codes/${id}`, 'DELETE');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel-agency-codes'] });
      setDeleteDialogOpen(false);
      setSelectedCode(null);
      toast({ title: 'Agency code deleted', description: 'The agency code has been removed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete agency code', variant: 'destructive' });
    }
  });

  const filteredCodes = agencyCodes.filter(code => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      code.agency_name?.toLowerCase().includes(query) ||
      code.agency_code?.toLowerCase().includes(query) ||
      code.contact_email?.toLowerCase().includes(query)
    );
  });

  const handleEdit = (code: AgencyCode) => {
    setSelectedCode(code);
    setFormData({
      agencyName: code.agency_name,
      agencyCode: code.agency_code,
      contactEmail: code.contact_email || '',
      contactPhone: code.contact_phone || '',
      notes: code.notes || '',
      isActive: code.is_active
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (code: AgencyCode) => {
    setSelectedCode(code);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Agency Codes</h2>
          <p className="text-gray-600">Manage valid agency codes for Travel Upload Portal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => { setFormData(defaultFormData); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Agency Code
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, code, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredCodes.length} codes</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading agency codes...</div>
      ) : filteredCodes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No agency codes match your search' : 'No agency codes yet. Add your first one!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCodes.map((code) => (
            <Card key={code.id} className={`${!code.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{code.agency_name}</CardTitle>
                    <CardDescription className="font-mono text-lg font-semibold text-[#D67C4A]">
                      {code.agency_code}
                    </CardDescription>
                  </div>
                  <Badge variant={code.is_active ? 'default' : 'secondary'}>
                    {code.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  {code.contact_email && (
                    <p>Email: {code.contact_email}</p>
                  )}
                  {code.contact_phone && (
                    <p>Phone: {code.contact_phone}</p>
                  )}
                  {code.notes && (
                    <p className="text-gray-500 italic truncate">{code.notes}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Created: {new Date(code.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(code)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(code)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Agency Code</DialogTitle>
            <DialogDescription>
              Create a new agency code for partner travel agencies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="agencyName">Agency Name *</Label>
              <Input
                id="agencyName"
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                placeholder="e.g., Voyages Excellence"
              />
            </div>
            <div>
              <Label htmlFor="agencyCode">Agency Code *</Label>
              <Input
                id="agencyCode"
                value={formData.agencyCode}
                onChange={(e) => setFormData({ ...formData, agencyCode: e.target.value.toUpperCase() })}
                placeholder="e.g., VE2025"
                className="font-mono uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">Code will be stored uppercase</p>
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contact@agency.com"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate(formData)} 
              disabled={!formData.agencyName || !formData.agencyCode || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Agency Code</DialogTitle>
            <DialogDescription>
              Update the agency code details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editAgencyName">Agency Name *</Label>
              <Input
                id="editAgencyName"
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editAgencyCode">Agency Code *</Label>
              <Input
                id="editAgencyCode"
                value={formData.agencyCode}
                onChange={(e) => setFormData({ ...formData, agencyCode: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
              />
            </div>
            <div>
              <Label htmlFor="editContactEmail">Contact Email</Label>
              <Input
                id="editContactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editContactPhone">Contact Phone</Label>
              <Input
                id="editContactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="editIsActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedCode && updateMutation.mutate({ id: selectedCode.id, data: formData })} 
              disabled={!formData.agencyName || !formData.agencyCode || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agency Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the agency code "{selectedCode?.agency_code}" ({selectedCode?.agency_name})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedCode && deleteMutation.mutate(selectedCode.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
