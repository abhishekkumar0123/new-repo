"use client";

import { useEffect, useState } from "react";
import { ProjectDetail } from "@/components/project-detail";

export default function ProjectIndexPage() {
  const [slug, setSlug] = useState("sample-project");
  useEffect(() => {
    setSlug(
      new URLSearchParams(window.location.search).get("slug") ||
        "sample-project",
    );
  }, []);
  return <ProjectDetail slug={slug} />;
}
