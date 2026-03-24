import { generateMeta } from "@/lib/utils";
import { PropertyListing } from "./components/property-listing";
import { Metadata } from "next";
import data from "../data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Real Estate Filter",
    description:
      "A professional real estate filter page admin dashboard template built with React, TypeScript, and shadcn/ui, featuring type-safe search parameters, dynamic category selection, and advanced filtering logic. These Tailwind CSS layouts are designed to provide a seamless data discovery experience, allowing for precise property management and streamlined navigation within your administrative interface.",
    canonical: "/real-estate/filter"
  });
}

export default function Page() {
  return <PropertyListing properties={data.properties} />;
}
