import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import PropertyCard from "../components/PropertyCard";
import type { Property, PropertyListResponse } from "../types";
import "./Listings.css";

export default function Listings() {
  const [location, setLocation] = useState("");
  const [bhk, setBhk] = useState("");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { page: String(page), limit: "9" };
      if (location) params.location = location;
      if (bhk) params.bhk = bhk;
      if (type) params.type = type;
      if (maxPrice) params.maxPrice = maxPrice;

      const { data } = await api.get<PropertyListResponse>("/properties", {
        params,
      });
      setProperties(data.properties);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total);
    } catch (err) {
      setError("Could not load listings. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [page, location, bhk, type, maxPrice]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProperties();
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <span className="hero-eyebrow">
            Estate Grove · Property marketplace
          </span>
          <h1>Find a home that fits how you actually live.</h1>
          <p>
            Search verified listings by location, BHK, and budget — straight
            from agents, no middlemen.
          </p>
        </div>
      </section>

      <div className="container search-panel">
        <form className="card search-panel-inner" onSubmit={handleSearchSubmit}>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              placeholder="e.g. Kalyan, Powai…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="bhk">BHK</label>
            <select
              id="bhk"
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} BHK
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Any</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="maxPrice">Max price (₹)</label>
            <input
              id="maxPrice"
              type="number"
              min="0"
              placeholder="No limit"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <button className="btn btn-accent" type="submit">
            Search
          </button>
        </form>
      </div>

      <section className="listings-section">
        <div className="container">
          <div className="listings-meta">
            <h2>Available properties</h2>
            {!loading && (
              <span>
                {total} result{total === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: "0 auto" }} />
            </div>
          ) : properties.length === 0 ? (
            <div className="empty-state">
              <h3>No properties match your search</h3>
              <p>Try widening your filters or checking back soon.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={n === page ? "active" : ""}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
