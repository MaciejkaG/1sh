"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  TrashIcon, 
  ExternalLinkIcon, 
  CopyIcon, 
  CheckIcon, 
  DownloadIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
  Loader2Icon,
  RefreshCwIcon
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { getTokenManager } from "@/lib/token-manager";
import { Link } from "@/lib/types";

// Types for API responses
interface LinkListResponse {
  success: boolean;
  data?: {
    links: Link[];
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  data?: {
    totalRequested: number;
    successfulDeletions: number;
    failedDeletions: number;
    results: Array<{ token: string; success: boolean; error?: string }>;
  };
  error?: string;
}

type SortField = 'createdAt' | 'clickCount' | 'originalUrl';
type SortOrder = 'asc' | 'desc';

interface LinkManagementDashboardProps {
  className?: string;
}

export function LinkManagementDashboard({ className }: LinkManagementDashboardProps): React.JSX.Element {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLinks, setTotalLinks] = useState(0);
  const limit = 10;

  // Load links from API using stored tokens
  const loadLinks = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const tokenManager = getTokenManager();
      const tokens = tokenManager.getTokens();

      if (tokens.length === 0) {
        setLinks([]);
        setTotalLinks(0);
        setTotalPages(1);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        tokens: tokens.join(','),
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy: sortField,
        sortOrder: sortOrder,
      });

      const response = await fetch(`/api/v1/links?${params}`);
      const result: LinkListResponse = await response.json();

      if (result.success && result.data) {
        setLinks(result.data.links);
        setTotalLinks(result.data.pagination.total);
        setTotalPages(Math.ceil(result.data.pagination.total / limit));
      } else {
        throw new Error(result.error || 'Failed to load links');
      }
    } catch (err) {
      console.error('Error loading links:', err);
      setError(err instanceof Error ? err.message : 'Failed to load links');
      setLinks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, sortField, sortOrder]);

  // Load links on component mount and when dependencies change
  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Filter links based on search term
  const filteredLinks = links.filter(link => 
    link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (link.customAlias && link.customAlias.toLowerCase().includes(searchTerm.toLowerCase())) ||
    link.shortCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle link selection
  const toggleLinkSelection = (linkId: string) => {
    const newSelection = new Set(selectedLinks);
    if (newSelection.has(linkId)) {
      newSelection.delete(linkId);
    } else {
      newSelection.add(linkId);
    }
    setSelectedLinks(newSelection);
  };

  const selectAllLinks = () => {
    if (selectedLinks.size === filteredLinks.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(filteredLinks.map(link => link.id)));
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Copy link to clipboard
  const copyToClipboard = async (shortUrl: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedLink(linkId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Delete selected links
  const deleteSelectedLinks = async () => {
    if (selectedLinks.size === 0) return;

    try {
      setDeleting(true);
      
      // Get tokens for selected links
      const tokenManager = getTokenManager();
      const tokensToDelete = Array.from(selectedLinks).map(linkId => {
        const link = links.find(l => l.id === linkId);
        return link?.managementToken;
      }).filter(Boolean) as string[];

      if (tokensToDelete.length === 0) {
        throw new Error('No valid tokens found for selected links');
      }

      const response = await fetch('/api/v1/links', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens: tokensToDelete }),
      });

      const result: DeleteResponse = await response.json();

      if (result.success && result.data) {
        // Remove successfully deleted tokens from localStorage
        result.data.results.forEach(deleteResult => {
          if (deleteResult.success) {
            tokenManager.removeToken(deleteResult.token);
          }
        });

        // Clear selection and reload links
        setSelectedLinks(new Set());
        await loadLinks();

        // Show success message
        if (result.data.successfulDeletions > 0) {
          console.log(`Successfully deleted ${result.data.successfulDeletions} links`);
        }
        if (result.data.failedDeletions > 0) {
          console.warn(`Failed to delete ${result.data.failedDeletions} links`);
        }
      } else {
        throw new Error(result.error || 'Failed to delete links');
      }
    } catch (err) {
      console.error('Error deleting links:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete links');
    } finally {
      setDeleting(false);
    }
  };

  // Export links as CSV
  const exportAsCSV = async () => {
    try {
      const tokenManager = getTokenManager();
      const tokens = tokenManager.getTokens();

      if (tokens.length === 0) {
        return;
      }

      const params = new URLSearchParams({
        tokens: tokens.join(','),
        format: 'csv',
      });

      const response = await fetch(`/api/v1/links?${params}`);
      
      if (response.ok) {
        const csvContent = await response.text();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `links-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to export CSV');
      }
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
    }
  };

  // Handle pagination
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
        <span>Loading your links...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <p className="text-red-600 mb-2">Error: {error}</p>
        <Button onClick={() => loadLinks()} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-gray-500 mb-4">No links found. Create your first shortened link above!</p>
        <Button onClick={() => loadLinks(true)} variant="outline" size="sm">
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Your Links ({totalLinks})</h2>
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => loadLinks(true)}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={exportAsCSV}
            variant="outline"
            size="sm"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          
          {selectedLinks.size > 0 && (
            <Button
              onClick={deleteSelectedLinks}
              variant="destructive"
              size="sm"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TrashIcon className="w-4 h-4 mr-2" />
              )}
              Delete ({selectedLinks.size})
            </Button>
          )}
        </div>
      </div>

      {/* Links table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLinks.size === filteredLinks.length && filteredLinks.length > 0}
                    onChange={selectAllLinks}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-left">
                  <button
                    onClick={() => handleSort('originalUrl')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Original URL
                    {sortField === 'originalUrl' && (
                      sortOrder === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-left">Short Link</th>
                <th className="p-3 text-left">
                  <button
                    onClick={() => handleSort('clickCount')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Clicks
                    {sortField === 'clickCount' && (
                      sortOrder === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-left">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Created
                    {sortField === 'createdAt' && (
                      sortOrder === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.map((link) => {
                const shortUrl = `${process.env.NEXT_PUBLIC_API_URL}/${link.customAlias || link.shortCode}`;
                const isSelected = selectedLinks.has(link.id);
                const isCopied = copiedLink === link.id;
                
                return (
                  <tr key={link.id} className={`border-t hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLinkSelection(link.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs">
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                          title={link.originalUrl}
                        >
                          {link.originalUrl}
                        </a>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {link.customAlias || link.shortCode}
                        </code>
                        {link.customAlias && (
                          <span className="text-xs text-green-600 bg-green-100 px-1 py-0.5 rounded">
                            custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{link.clickCount}</span>
                        <span className="text-sm text-gray-500">
                          ({link.uniqueVisitors} unique)
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-600">
                        {format(new Date(link.createdAt), 'MMM d, yyyy')}
                        {link.expiresAt && (
                          <div className="text-xs text-orange-600">
                            Expires: {format(new Date(link.expiresAt), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => copyToClipboard(shortUrl, link.id)}
                          variant="ghost"
                          size="sm"
                          title={isCopied ? "Copied!" : "Copy link"}
                        >
                          {isCopied ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <CopyIcon className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => window.open(shortUrl, '_blank')}
                          variant="ghost"
                          size="sm"
                          title="Open link"
                        >
                          <ExternalLinkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalLinks)} of {totalLinks} links
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}