"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Plus, Search, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiSearchStudents, apiCreateClass, type StudentRef } from "@/lib/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function NewClassPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentRef[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    async function run() {
      if (!q) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await apiSearchStudents(q);
        if (!cancelled) setResults(res);
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || "Failed to search students");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }
    const t = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id))
        n.delete(id);
      else
        n.add(id);

      return n;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    if (!isLoaded || !user) {
      toast.error("User not loaded. Please sign in again.");
      return;
    }
    try {
      const cls = await apiCreateClass({
        account_id: user.id,
        name: name.trim(),
        subject: subject.trim(),
        student_ids: Array.from(selected),
      });

      toast.success("Class created successfully");
      router.push(`/dashboard/classes/${cls.id}`);
    }
    catch (err: any) {
      toast.error(err.message || "Failed to create class");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Classes
        </Link>
      </div>

      <Card className="border-0 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Create a new class</CardTitle>
          <CardDescription>Provide a name, subject, and select students to include in this class.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Class name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Computer Science 101" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., CS101" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Select students ({selected.size} selected)</div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by id or name" className="pl-9" />
              </div>

              <div className="max-h-80 overflow-auto rounded-lg border divide-y divide-border/60">
                {!query.trim() && (
                  <div className="p-6 text-sm text-muted-foreground text-center">Type to search students by id or name.</div>
                )}
                {query.trim() && searching && (
                  <div className="p-6 text-sm text-muted-foreground text-center">Searching…</div>
                )}
                {query.trim() && !searching && results.map((s, idx) => (
                  <motion.label
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.02 }}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.name} <span className="text-xs text-muted-foreground">({s.id})</span></div>
                    </div>
                    {selected.has(s.id) && <Check className="w-4 h-4 text-emerald-500" />}
                  </motion.label>
                ))}
                {query.trim() && !searching && results.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">No students match your search.</div>
                )}
              </div>

              {selected.size > 0 && (
                <div className="text-xs text-muted-foreground">Selected: {Array.from(selected).join(", ")}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Class
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
