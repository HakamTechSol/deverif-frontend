import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, DoorOpen } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./_app.requests";
import { adminLeadsService } from "@/services";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/leads")({
  head: () => ({ meta: [{ title: "Leads — Dvarif Admin" }] }),
  component: AdminLeadsPage,
});

function AdminLeadsPage() {
  return (
    <div>
      <PageHeader
        title="Leads"
        description="Review contact form submissions and access requests from the marketing website."
      />

      <Tabs defaultValue="contact">
        <TabsList className="mb-4">
          <TabsTrigger value="contact">
            <MessageSquare className="mr-1.5 h-4 w-4" /> Contact Form
          </TabsTrigger>
          <TabsTrigger value="access">
            <DoorOpen className="mr-1.5 h-4 w-4" /> Access Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <ContactLeadsTab />
        </TabsContent>

        <TabsContent value="access">
          <AccessRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactLeadsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["admin-contact-leads", page, search],
    queryFn: () => adminLeadsService.contactLeads({ page, limit: 20, search }),
  });

  const items = list.data?.items ?? [];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
    return (
      <Badge variant="outline" className={`rounded-full capitalize ${map[status] ?? ""}`}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search name, email, phone…"
          />
        </div>
        {list.isLoading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={MessageSquare} title="No contact submissions yet" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((lead) => (
                  <TableRow key={lead.uuid}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {lead.message ?? "—"}
                    </TableCell>
                    <TableCell>{statusBadge(lead.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              total={list.data?.total ?? 0}
              totalPages={list.data?.totalPages ?? 1}
              onChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AccessRequestsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["admin-access-requests", page, search],
    queryFn: () => adminLeadsService.accessRequests({ page, limit: 20, search }),
  });

  const items = list.data?.items ?? [];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      onboarded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <Badge variant="outline" className={`rounded-full capitalize ${map[status] ?? ""}`}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search organization, contact, email…"
          />
        </div>
        {list.isLoading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={DoorOpen} title="No access requests yet" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((req) => (
                  <TableRow key={req.uuid}>
                    <TableCell className="font-medium">{req.organization_name}</TableCell>
                    <TableCell className="text-muted-foreground">{req.contact_name}</TableCell>
                    <TableCell className="text-muted-foreground">{req.email}</TableCell>
                    <TableCell className="text-muted-foreground">{req.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{req.company_size ?? "—"}</TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(req.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              total={list.data?.total ?? 0}
              totalPages={list.data?.totalPages ?? 1}
              onChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
