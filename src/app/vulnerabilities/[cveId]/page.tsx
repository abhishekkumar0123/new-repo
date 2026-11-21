import { CveDetailPageClient } from "./cve-detail-page-client";

export function generateStaticParams() {
  return [
    { cveId: "CVE-2021-44228" },
    { cveId: "CVE-2021-34527" },
    { cveId: "CVE-2017-0144" },
    { cveId: "CVE-2020-0601" },
    { cveId: "CVE-2022-22965" },
    { cveId: "CVE-2021-26855" },
    { cveId: "CVE-2020-1472" },
    { cveId: "CVE-2019-0708" },
  ];
}

export default async function CveDetailPage({
  params,
}: {
  params: { cveId: string };
}) {
  const { cveId } = await params;
  return <CveDetailPageClient cveId={cveId} />;
}
