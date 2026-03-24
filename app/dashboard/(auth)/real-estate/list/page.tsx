import { PropertyTable } from "./components/property-table";
import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";
import data from "../data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Real Estate Property List",
    description:
      "A comprehensive real estate list admin dashboard template built with React, TypeScript, shadcn/ui, and Tailwind CSS, featuring type-safe property management grids, dynamic filtering, and seamless data visualization. These Tailwind CSS layouts are designed to streamline real estate workflows, providing a professional and responsive administrative interface for managing high-volume property inventories.",
    canonical: "/real-estate/list"
  });
}

export default function Page() {
  return <PropertyTable items={data.properties} />;
}
