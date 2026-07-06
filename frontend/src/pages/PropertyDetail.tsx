import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import type { Property } from "../types";
import "./PropertyDetail.css";

function formatPrice(price: number, type: "sale" | "rent") {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  return type === "rent" ? `${formatted}/mo` : formatted;
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enquiry, setEnquiry] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [enquirySent, setEnquirySent] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/properties/${id}`);
      setProperty(data.property);
    } catch (err) {
      setError("Property not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (user && user.role === "seeker") {
      setEnquiry((e) => ({ ...e, name: user.name, email: user.email }));
    }
  }, [user]);

  const handleEnquirySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEnquiryError("");
    setSubmitting(true);
    try {
      await api.post("/enquiries", { propertyId: id, ...enquiry });
      setEnquirySent(true);
    } catch (err: any) {
      setEnquiryError(
        err?.response?.data?.message || "Could not send your enquiry.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await api.delete(`/properties/${id}`);
      navigate("/dashboard");
    } catch {
      alert("Could not delete this listing.");
    }
  };

  if (loading) {
    return (
      <div className="detail-page container">
        <div className="empty-state">
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="detail-page container">
        <div className="empty-state">
          <h3>{error || "Property not found."}</h3>
          <Link to="/" className="btn btn-outline" style={{ marginTop: 16 }}>
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === "agent" && user.id === property.agentId;
  const images = property.images || [];

  return (
    <div className="detail-page container">
      {images.length > 0 ? (
        <div className="detail-gallery">
          <div
            className="detail-media"
            style={{ backgroundImage: `url(${images[activeImage].url})` }}
          />
          {images.length > 1 && (
            <div className="detail-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.publicId || i}
                  className={`detail-thumb ${i === activeImage ? "active" : ""}`}
                  style={{ backgroundImage: `url(${img.url})` }}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="detail-media">
          <span className="detail-media-label">
            {property.bhk} BHK · {property.location}
          </span>
        </div>
      )}

      <div className="detail-layout">
        <div>
          <div className="detail-top">
            <div>
              <span className={`badge badge-${property.type}`}>
                {property.type === "sale" ? "For sale" : "For rent"}
              </span>
              <h1>{property.title}</h1>
              <p className="detail-location">{property.location}</p>
            </div>
            <div className="detail-price">
              {formatPrice(property.price, property.type)}
            </div>
          </div>

          <div className="detail-stats">
            <div className="detail-stat">
              <strong>{property.bhk}</strong>
              <span>BHK</span>
            </div>
            {property.area ? (
              <div className="detail-stat">
                <strong>{property.area}</strong>
                <span>Sq. ft</span>
              </div>
            ) : null}
            <div className="detail-stat">
              <strong>{property.views}</strong>
              <span>Views</span>
            </div>
          </div>

          <div className="detail-description">
            <h2>About this property</h2>
            <p>{property.description || "No description provided."}</p>
          </div>

          {isOwner && (
            <div className="detail-owner-actions">
              <Link
                to={`/properties/${property.id}/edit`}
                className="btn btn-outline btn-sm"
              >
                Edit listing
              </Link>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                Delete listing
              </button>
            </div>
          )}
        </div>

        <div className="card enquiry-card">
          {isOwner ? (
            <>
              <h2>This is your listing</h2>
              <p className="enquiry-card-sub">
                View enquiries for this property from your dashboard.
              </p>
              <Link to="/dashboard" className="btn btn-primary btn-block">
                Go to dashboard
              </Link>
            </>
          ) : enquirySent ? (
            <>
              <h2>Enquiry sent ✓</h2>
              <p className="enquiry-card-sub">
                The agent will get back to you shortly.
              </p>
            </>
          ) : (
            <>
              <h2>Interested in this home?</h2>
              <p className="enquiry-card-sub">
                Send an enquiry and the agent will contact you directly.
              </p>

              {enquiryError && (
                <div className="alert alert-error">{enquiryError}</div>
              )}

              <form onSubmit={handleEnquirySubmit}>
                <div className="field">
                  <label htmlFor="enq-name">Your name</label>
                  <input
                    id="enq-name"
                    value={enquiry.name}
                    onChange={(e) =>
                      setEnquiry({ ...enquiry, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="enq-phone">Phone number</label>
                  <input
                    id="enq-phone"
                    value={enquiry.phone}
                    onChange={(e) =>
                      setEnquiry({ ...enquiry, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="enq-email">Email (optional)</label>
                  <input
                    id="enq-email"
                    type="email"
                    value={enquiry.email}
                    onChange={(e) =>
                      setEnquiry({ ...enquiry, email: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="enq-message">Message (optional)</label>
                  <textarea
                    id="enq-message"
                    value={enquiry.message}
                    onChange={(e) =>
                      setEnquiry({ ...enquiry, message: e.target.value })
                    }
                    placeholder="I'd like to schedule a visit…"
                  />
                </div>
                <button
                  className="btn btn-accent btn-block"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send enquiry"}
                </button>
              </form>
            </>
          )}

          <div className="agent-badge">
            <div className="agent-avatar">{property.agentName.charAt(0)}</div>
            <div>
              {property.agentName}
              <span>Listing agent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
