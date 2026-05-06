import { useState, useRef, useCallback } from "react";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dwqbtroxk";
const UPLOAD_PRESET = "monprojetimmo";

export default function ImageUploader({ onImagesUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFiles = useCallback((newFiles) => {
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
    const previews = imageFiles.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
      status: "pending"
    }));
    setFiles(prev => [...prev, ...previews]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const uploadToCloudinary = async (fileObj) => {
    const formData = new FormData();
    formData.append("file", fileObj.file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("format", "jpg");
    formData.append("quality", "auto");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error(`Cloudinary error: ${res.status}`);
    const data = await res.json();
    return data.secure_url;
  };

  const handleUpload = async () => {
    const pending = files.filter(f => f.status === "pending");
    if (!pending.length) return;

    setUploading(true);
    const newUrls = [];

    setFiles(prev => prev.map(f =>
      f.status === "pending" ? { ...f, status: "uploading" } : f
    ));

    for (const fileObj of pending) {
      try {
        const url = await uploadToCloudinary(fileObj);
        newUrls.push(url);
        setFiles(prev => prev.map(f =>
          f.name === fileObj.name ? { ...f, status: "done", url } : f
        ));
      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.name === fileObj.name ? { ...f, status: "error" } : f
        ));
      }
    }

    const allUrls = [...uploadedUrls, ...newUrls];
    setUploadedUrls(allUrls);
    setUploading(false);
    if (onImagesUploaded) onImagesUploaded(allUrls);
  };

  const copyUrls = () => {
    const text = uploadedUrls.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const reset = () => {
    setFiles([]);
    setUploadedUrls([]);
    setCopied(false);
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      padding: "20px",
      background: "#0f1117",
      minHeight: "100vh",
      color: "#e8e8e8"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#c8a96e",
          margin: 0,
          marginBottom: "4px"
        }}>
          📸 Upload Photos
        </h2>
        <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
          Glissez vos photos — elles seront hébergées sur Cloudinary et prêtes pour Instagram
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#c8a96e" : "#2a2a3a"}`,
          borderRadius: "12px",
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "rgba(200,169,110,0.05)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s ease",
          marginBottom: "16px"
        }}
      >
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>🖼️</div>
        <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
          Cliquez ou glissez vos photos ici
        </p>
        <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0" }}>
          JPG, PNG, WEBP — plusieurs fichiers acceptés
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              marginBottom: "6px",
              border: "1px solid rgba(255,255,255,0.06)"
            }}>
              <img
                src={f.preview}
                alt={f.name}
                style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "12px", margin: 0, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </p>
                <p style={{ fontSize: "11px", margin: "2px 0 0", color: f.status === "done" ? "#4ade80" : f.status === "error" ? "#f87171" : f.status === "uploading" ? "#c8a96e" : "#555" }}>
                  {f.status === "done" ? "✓ Uploadé" : f.status === "error" ? "✗ Erreur" : f.status === "uploading" ? "⟳ En cours…" : "En attente"}
                </p>
              </div>
              {f.status === "pending" && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                  style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
                >×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.filter(f => f.status === "pending").length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: "100%",
            padding: "12px",
            background: uploading ? "#2a2a3a" : "linear-gradient(135deg, #c8a96e, #a07840)",
            color: uploading ? "#666" : "#0f1117",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.05em",
            cursor: uploading ? "not-allowed" : "pointer",
            marginBottom: "16px",
            transition: "all 0.2s ease"
          }}
        >
          {uploading ? "⟳ Upload en cours…" : `⬆ Uploader ${files.filter(f => f.status === "pending").length} photo(s)`}
        </button>
      )}

      {/* Results */}
      {uploadedUrls.length > 0 && (
        <div style={{
          background: "rgba(74,222,128,0.05)",
          border: "1px solid rgba(74,222,128,0.2)",
          borderRadius: "10px",
          padding: "14px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <p style={{ fontSize: "12px", color: "#4ade80", fontWeight: 600, margin: 0 }}>
              ✓ {uploadedUrls.length} photo(s) prêtes
            </p>
            <button
              onClick={copyUrls}
              style={{
                background: copied ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "11px",
                color: copied ? "#4ade80" : "#aaa",
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace"
              }}
            >
              {copied ? "✓ Copié !" : "Copier les URLs"}
            </button>
          </div>
          {uploadedUrls.map((url, i) => (
            <div key={i} style={{
              fontSize: "10px",
              color: "#666",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "4px",
              padding: "6px 8px",
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "'Space Mono', monospace"
            }}>
              {url}
            </div>
          ))}
          <p style={{ fontSize: "11px", color: "#666", margin: "10px 0 0" }}>
            💡 Copiez ces URLs et donnez-les à Alex pour publier
          </p>
        </div>
      )}

      {/* Reset */}
      {files.length > 0 && (
        <button
          onClick={reset}
          style={{
            background: "none",
            border: "1px solid #2a2a3a",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "11px",
            color: "#555",
            cursor: "pointer",
            width: "100%"
          }}
        >
          Effacer tout
        </button>
      )}
    </div>
  );
}
