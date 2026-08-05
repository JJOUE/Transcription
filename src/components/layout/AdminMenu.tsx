import React from 'react';
import Link from 'next/link';
import { Shield, Users, Clock, DollarSign, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function AdminMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-[#b29dd9] text-[#003366]">
          <Shield className="mr-2 h-4 w-4" />
          Admin
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuItem asChild>
          <Link href="/admin" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            User Management
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/queue" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Transcription Queue
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/ledger" className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4" />
            Billing Ledger
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/packages" className="flex items-center">
            <Package className="mr-2 h-4 w-4" />
            Package Manager
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
