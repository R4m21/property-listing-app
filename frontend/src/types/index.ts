export type Role = "agent" | "seeker";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface PropertyImage {
  url: string;
  publicId: string;
}

export interface Property {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  description: string;
  location: string;
  bhk: number;
  price: number;
  type: "sale" | "rent";
  area?: number | null;
  images: PropertyImage[];
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  agentId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
}

export interface PropertyListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  properties: Property[];
}
