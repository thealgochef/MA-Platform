"use client";

import { useParams } from "next/navigation";
import ProjectDealsView from "@/components/buyer/ProjectDealsView";

export default function ProjectActiveDealsPage() {
  const params = useParams();

  return <ProjectDealsView projectId={params.id as string} />;
}