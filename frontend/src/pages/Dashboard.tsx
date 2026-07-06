import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import type { Enquiry, Property } from "../types";
import "./Dashboard.css";

function formatPrice(price: number, type: "sale" | "rent") {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  return type === "rent" ? `${formatted}/mo` : formatted;
}

export default function Dashboard() {
  const [tab, setTab] = useState<"listings" | "enquiries">("listings");
  const [properties, setProperties] = useState<Property[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [propsRes, enqRes] = await Promise.all([
        api.get("/properties/mine"),
        api.get("/enquiries/mine"),
      ]);
      setProperties(propsRes.data.properties);
      setEnquiries(enqRes.data.enquiries);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    await api.delete(`/properties/${id}`);
    loadAll();
  };

  const handleStatusChange = async (id: string, status: string) => {
    setEnquiries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: status as Enquiry["status"] } : e,
      ),
    );
    await api.patch(`/enquiries/${id}/status`, { status });
  };

  const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
  const newEnquiries = enquiries.filter((e) => e.status === "new").length;

  return (
    <div className="dashboard-page container">
      <div className="dashboard-header">
        <div>
          <span>Agent dashboard</span>
          <h1>Your listings & enquiries</h1>
        </div>
        <Link to="/add-property" className="btn btn-accent">
          + Add property
        </Link>
      </div>

      <div className="dashboard-stats">
        <div className="card stat-card">
          <strong>{properties.length}</strong>
          <span>Active listings</span>
        </div>
        <div className="card stat-card">
          <strong>{totalViews}</strong>
          <span>Total views</span>
        </div>
        <div className="card stat-card">
          <strong>{enquiries.length}</strong>
          <span>Total enquiries</span>
        </div>
        <div className="card stat-card">
          <strong>{newEnquiries}</strong>
          <span>New enquiries</span>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={tab === "listings" ? "active" : ""}
          onClick={() => setTab("listings")}
        >
          My listings ({properties.length})
        </button>
        <button
          className={tab === "enquiries" ? "active" : ""}
          onClick={() => setTab("enquiries")}
        >
          Enquiries ({enquiries.length})
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : tab === "listings" ? (
        properties.length === 0 ? (
          <div className="empty-state">
            <h3>No listings yet</h3>
            <p>Publish your first property to start receiving enquiries.</p>
          </div>
        ) : (
          <div className="card">
            {properties.map((p) => (
              <div className="my-listing-row" key={p.id}>
                <div className="my-listing-info">
                  <h3>{p.title}</h3>
                  <p>
                    {p.location} · {p.bhk} BHK · {formatPrice(p.price, p.type)}{" "}
                    · {p.views} views
                  </p>
                </div>
                <div className="my-listing-actions">
                  <Link
                    to={`/properties/${p.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    View
                  </Link>
                  <Link
                    to={`/properties/${p.id}/edit`}
                    className="btn btn-outline btn-sm"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : enquiries.length === 0 ? (
        <div className="empty-state">
          <h3>No enquiries yet</h3>
          <p>Enquiries submitted by home seekers will show up here.</p>
        </div>
      ) : (
        <div className="card">
          {enquiries.map((e) => (
            <div className="enquiry-row" key={e.id}>
              <div>
                <h4>{e.propertyTitle}</h4>
                <p>
                  {new Date(e.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="enquiry-contact">
                <strong>{e.name}</strong>
                <br />
                {e.phone}
                {e.email ? ` · ${e.email}` : ""}
              </div>
              <p>{e.message || <em>No message</em>}</p>
              <select
                className="enquiry-status-select"
                value={e.status}
                onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
