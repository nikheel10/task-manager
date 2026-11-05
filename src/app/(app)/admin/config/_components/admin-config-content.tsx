'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ConfigItem {
  key: string;
  label: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface AdminConfigContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function AdminConfigContent({ user }: AdminConfigContentProps) {
  const [taskCategories, setTaskCategories] = useState<ConfigItem[]>([]);
  const [entityTypes, setEntityTypes] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'entities'>('categories');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [catsRes, entitiesRes] = await Promise.all([
        fetch('/api/admin/config/task-categories'),
        fetch('/api/admin/config/entity-types'),
      ]);
      if (catsRes.ok) {
        const data = await catsRes.json();
        setTaskCategories(data.categories || []);
      }
      if (entitiesRes.ok) {
        const data = await entitiesRes.json();
        setEntityTypes(data.types || []);
      }
    } catch (error) {
      toast.error('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const saveCategory = async (item: ConfigItem) => {
    try {
      const res = await fetch('/api/admin/config/task-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        toast.success('Category saved');
        fetchConfig();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save category');
      }
    } catch {
      toast.error('Failed to save category');
    }
  };

  const saveEntityType = async (item: ConfigItem) => {
    try {
      const res = await fetch('/api/admin/config/entity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        toast.success('Entity type saved');
        fetchConfig();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save entity type');
      }
    } catch {
      toast.error('Failed to save entity type');
    }
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
            <p className="text-muted-foreground">
              Manage display labels, colours, and sort order for system entities
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'categories' ? 'default' : 'outline'}
            onClick={() => setActiveTab('categories')}
          >
            Task Categories
          </Button>
          <Button
            variant={activeTab === 'entities' ? 'default' : 'outline'}
            onClick={() => setActiveTab('entities')}
          >
            Entity Types
          </Button>
        </div>

        {activeTab === 'categories' ? (
          <Card>
            <CardHeader>
              <CardTitle>Task Categories</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure labels, colours, and sort order for task categories
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="h-32 bg-muted rounded animate-pulse" />
              ) : (
                <>
                  {taskCategories.map((cat) => (
                    <div key={cat.key} className="flex items-center gap-3 p-3 border rounded">
                      <Input
                        value={cat.label}
                        onChange={(e) => {
                          setTaskCategories((prev) =>
                            prev.map((c) => (c.key === cat.key ? { ...c, label: e.target.value } : c))
                          );
                        }}
                        className="flex-1"
                        disabled={loading}
                      />
                      <Input
                        type="number"
                        value={cat.sortOrder ?? 0}
                        onChange={(e) => {
                          setTaskCategories((prev) =>
                            prev.map((c) => (c.key === cat.key ? { ...c, sortOrder: Number(e.target.value) || 0 } : c))
                          );
                        }}
                        className="w-20"
                        disabled={loading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveCategory(cat)}
                        disabled={loading}
                      >
                        Save
                      </Button>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="New category name"
                        className="flex-1"
                        disabled={loading}
                      />
                      <Input
                        type="number"
                        placeholder="Sort order"
                        className="w-32"
                        disabled={loading}
                      />
                      <Button onClick={() => {}} disabled={loading}>
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Entity Types</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure labels for entity types used in alerts
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="h-32 bg-muted rounded animate-pulse" />
              ) : (
                <>
                  {entityTypes.map((type) => (
                    <div key={type.key} className="flex items-center gap-3 p-3 border rounded">
                      <Input
                        value={type.label}
                        onChange={(e) => {
                          setEntityTypes((prev) =>
                            prev.map((t) => (t.key === type.key ? { ...t, label: e.target.value } : t))
                          );
                        }}
                        className="flex-1"
                        disabled={loading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveEntityType(type)}
                        disabled={loading}
                      >
                        Save
                      </Button>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex gap-2">
                      <Input placeholder="New entity type" className="flex-1" disabled={loading} />
                      <Button onClick={() => {}} disabled={loading}>
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


