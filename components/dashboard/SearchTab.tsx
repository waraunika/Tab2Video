"use client";

import {
  Album,
  ChevronLeft,
  ChevronRight,
  Music,
  Search,
  User,
} from "lucide-react";
import { Input } from "../ui/input";
import Tab from "@/types/tabSearch";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface SearchTabsProps {
  onTabSelect?: (tab: Tab) => void;
  className?: string;
  userId?: string; 
}

const ITEMS_PER_PAGE = 12;

export default function SearchTabs({
  onTabSelect,
  className,
  userId,
}: SearchTabsProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const supabase = createClient();
  const debouncedSearch = useDebounce(searchQuery, 500);

  const router = useRouter();

  const handleTabClick = async (tab: Tab) => {
    if (tab.file_path) {
      const { data, error } = await supabase.storage
        .from("user-tabs")
        .createSignedUrl(tab.file_path, 3600);

      if (error || !data?.signedUrl) {
        console.error("Failed to get signed URL", error);
        return;
      }

      const encoded = encodeURIComponent(data.signedUrl);
      router.push(
        `/view-tab?url=${encoded}&title=${encodeURIComponent(tab.title)}`,
      );
    }
  };

  useEffect(() => {
  const fetchTabs = async () => {
    setLoading(true);
    try {
      // Start with base query
      let query = supabase
        .from("tabs")
        .select(
          `
          *,
          profiles:created_by (
            display_name
          )
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE - 1,
        );

      // Apply filters based on mode
      if (userId) {
        // User mode: show all tabs uploaded by this user (public + private)
        query = query.eq("created_by", userId);
      } else {
        // Public mode: only public tabs
        query = query.eq("is_public", true);
      }

      // Apply search filter if present
      if (debouncedSearch) {
        query = query.or(
          `title.ilike.%${debouncedSearch}%,` +
            `artist.ilike.%${debouncedSearch}%,` +
            `album.ilike.%${debouncedSearch}%`,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching tabs: ", error);
        return;
      }
      setTabs(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Unexpected error: ", error);
    } finally {
      setLoading(false);
    }
  };

  fetchTabs();
}, [debouncedSearch, currentPage, supabase, userId]); 

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDisplayName = (tab: Tab) => {
    if (!tab.profiles) return "Unknown";
    return tab.profiles.display_name || "Unknown";
  };

  return (
    <div className={`space-y-6 ${className || ""}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tabs by title, artist, or album..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-10"
        />
      </div>

      {!loading && (
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "No tabs found"
            : `Found ${totalCount} tab${totalCount !== 1 ? "s" : ""}`}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-5 bg-muted rounded w-1/4"></div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>

              <CardFooter>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardFooter>
            </Card>
          ))
        ) : tabs.length > 0 ? (
          tabs.map((tab) => (
            <Card
              key={tab.id}
              className="hover:shadow-lg transition-shadow cursor-pointer fade-in"
              onClick={() => handleTabClick(tab)}
            >
              <CardHeader>
                <CardTitle className="line-clamp-1">
                  <div className="flex">
                    <Music className="h-4 w-4" />
                    &nbsp;
                    {tab.title}
                  </div>
                </CardTitle>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <p>Uploaded by</p>
                  <span className="line-clamp-1">
                    <i>{getDisplayName(tab)}</i>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="line-clamp-1">{tab.artist}</span>
                </div>

                {tab.album && (
                  <div className="flex items-center gap-2 text-sm">
                    <Album className="h-3 w-3 text-muted-foreground shrink-0" />

                    <span className="line-clamp-1">{tab.album}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between">
                <Badge variant={"secondary"} className="text-xs">
                  Public
                </Badge>

                <span className="text-sx text-muted-foreground">
                  {formatDate(tab.created_at)}
                </span>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Music className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tabs found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : "No public tabs available yet"}
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              variant={"outline"}
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button
              variant={"outline"}
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
