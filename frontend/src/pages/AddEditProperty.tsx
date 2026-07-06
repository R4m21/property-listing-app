import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import type { PropertyImage } from "../types";
import "./FormPage.css";

interface FormState {
  title: string;
  description: string;
  location: string;
  bhk: string;
  price: string;
  type: "sale" | "rent";
  area: string;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  location: "",
  bhk: "2",
  price: "",
  type: "sale",
  area: "",
};

export default function AddEditProperty() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/properties/${id}`);
        const p = data.property;
        setForm({
          title: p.title,
          description: p.description || "",
          location: p.location,
          bhk: String(p.bhk),
          price: String(p.price),
          type: p.type,
          area: p.area ? String(p.area) : "",
        });
        setImages(p.images || []);
      } catch (err) {
        setError("Could not load this property.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const update = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 6) {
      setUploadError("You can upload up to 6 images per listing.");
      return;
    }

    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));

      const { data } = await api.post("/uploads/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => [...prev, ...data.images]);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Image upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async (img: PropertyImage) => {
    setImages((prev) => prev.filter((i) => i.publicId !== img.publicId));
    try {
      await api.delete("/uploads/images", {
        params: { publicId: img.publicId },
      });
    } catch {
      // Non-fatal: the image is already detached from the form; ignore cleanup errors.
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        bhk: Number(form.bhk),
        price: Number(form.price),
        area: form.area ? Number(form.area) : null,
        images,
      };

      if (isEdit) {
        await api.patch(`/properties/${id}`, payload);
        navigate(`/properties/${id}`);
      } else {
        const { data } = await api.post("/properties", payload);
        navigate(`/properties/${data.property.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save this listing.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="form-page container">
        <div className="empty-state">
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="form-page container">
      <div className="form-page-header">
        <span>{isEdit ? "Edit listing" : "New listing"}</span>
        <h1>{isEdit ? "Update property details" : "List a new property"}</h1>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Sunny 2BHK near Powai Lake"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the property, amenities, nearby landmarks…"
          />
        </div>

        <div className="field">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. Kalyan West, Thane"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="images">Photos (up to 6)</label>
          {uploadError && (
            <div className="alert alert-error">{uploadError}</div>
          )}
          {images.length > 0 && (
            <div className="image-preview-grid">
              {images.map((img) => (
                <div className="image-preview" key={img.publicId}>
                  <img src={img.url} alt="Property" />
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={() => handleRemoveImage(img)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            disabled={uploading || images.length >= 6}
          />
          {uploading && <span className="upload-hint">Uploading…</span>}
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="bhk">BHK</label>
            <select
              id="bhk"
              value={form.bhk}
              onChange={(e) => update("bhk", e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} BHK
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="type">Listing type</label>
            <select
              id="type"
              value={form.type}
              onChange={(e) =>
                update("type", e.target.value as "sale" | "rent")
              }
            >
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="price">
              Price (₹{form.type === "rent" ? "/month" : ""})
            </label>
            <input
              id="price"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="area">Area (sq.ft, optional)</label>
            <input
              id="area"
              type="number"
              min="0"
              value={form.area}
              onChange={(e) => update("area", e.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Publish listing"}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
