'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function SkeletonTable({ columns = 4, rows = 5, className }: SkeletonTableProps) {
  return (
    <div className={cn(className)}>
      <Card>
        <CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                {[...Array(columns)].map((_, i) => (
                  <TableHead key={i} className="h-10">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, rowIdx) => (
                <TableRow key={rowIdx} className="h-12">
                  {[...Array(columns)].map((_, colIdx) => (
                    <TableCell key={colIdx}>
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="space-y-2 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
