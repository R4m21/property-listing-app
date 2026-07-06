import { Link } from "react-router-dom";
import type { Property } from "../types";
import "./PropertyCard.css";

function formatPrice(price: number, type: "sale" | "rent") {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  return type === "rent" ? `${formatted}/mo` : formatted;
}

export default function PropertyCard({ property }: { property: Property }) {
  const cover = property.images?.[0]?.url;

  return (
    <Link to={`/properties/${property.id}`} className="property-card card">
      <div
        className="property-card-media"
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        <span className={`badge badge-${property.type}`}>
          {property.type === "sale" ? "For sale" : "For rent"}
        </span>
        <span className="property-card-bhk">{property.bhk} BHK</span>
      </div>
      <div className="property-card-body">
        <h3>{property.title}</h3>
        <p className="property-card-location">{property.location}</p>
        <p className="property-card-price">
          {formatPrice(property.price, property.type)}
        </p>
        {property.area ? (
          <p className="property-card-area">{property.area} sq.ft</p>
        ) : null}
      </div>
    </Link>
  );
}
