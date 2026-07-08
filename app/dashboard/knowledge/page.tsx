"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import {
  BookOpen,
  Plus,
  Search,
  Building,
  UploadCloud,
  FileText,
  Trash2,
  Edit,
  Database,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  MapPin,
  CircleDollarSign,
  Briefcase
} from "lucide-react";

// Mock Initial Property Listings
interface Property {
  id: string;
  name: string;
  location: string;
  type: string;
  price: string;
  amenities: string[];
  status: string;
  builder: string;
  sqft: string;
}

// FAQs are kept local (no backend endpoint for them yet)
interface FaqDoc {
  id: string;
  title: string;
  type: "pdf" | "txt" | "docx";
  size: string;
  date: string;
  tokens: string;
}

const initialFaqs: FaqDoc[] = [
  {
    id: "FAQ-001",
    title: "Pricing & Refund Policies v1.2",
    type: "pdf",
    size: "1.4 MB",
    date: "10 Jun 2026",
    tokens: "12,450 tokens",
  },
  {
    id: "FAQ-002",
    title: "Standard Payment Schedule Guidelines",
    type: "docx",
    size: "820 KB",
    date: "14 Jun 2026",
    tokens: "5,180 tokens",
  },
  {
    id: "FAQ-003",
    title: "Project Amenities & Location Map Details",
    type: "txt",
    size: "45 KB",
    date: "18 Jun 2026",
    tokens: "8,920 tokens",
  },
];

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<"properties" | "faq">("properties");
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [faqs, setFaqs] = useState<FaqDoc[]>(initialFaqs);
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState("Admin");
  const [isMounted, setIsMounted] = useState(false);

  const loadProperties = useCallback(async () => {
    setPropertiesLoading(true);
    try {
      const data = await api.getProperties();
      setProperties(data);
    } catch (err) {
      console.error("Failed to load properties:", err);
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  // Property Modal State
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [newProp, setNewProp] = useState<Partial<Property>>({
    name: "",
    location: "",
    type: "2BHK Apartment",
    price: "",
    amenities: [],
    status: "Available",
    builder: "",
    sqft: "",
  });
  const [amenityInput, setAmenityInput] = useState("");

  // FAQ manual entry State
  const [newFaqTitle, setNewFaqTitle] = useState("");
  const [faqContent, setFaqContent] = useState("");
  const [faqStatusMsg, setFaqStatusMsg] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setRole(localStorage.getItem("userRole") || "Admin");
    loadProperties();

    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, [loadProperties]);

  if (!isMounted) return null;

  const handleDeleteProperty = async (id: string) => {
    if (role === "Sales") {
      alert("Unauthorized: Sales role cannot delete properties.");
      return;
    }
    if (confirm("Are you sure you want to delete this property?")) {
      try {
        await api.deleteProperty(id);
        setProperties(properties.filter((p) => p.id !== id));
      } catch (err: any) {
        alert("Failed to delete property: " + err.message);
      }
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.name || !newProp.price || !newProp.location) {
      alert("Please fill in property name, price, and location.");
      return;
    }
    try {
      const payload = {
        name: newProp.name,
        location: newProp.location,
        type: newProp.type || "2BHK Apartment",
        price: newProp.price,
        amenities: newProp.amenities || [],
        status: newProp.status || "Available",
        builder: newProp.builder || "EstateAI Receptionist Developers",
        sqft: newProp.sqft || "1,200 Sq.Ft.",
      };
      const created = await api.createProperty(payload);
      setProperties([created, ...properties]);
      setIsPropModalOpen(false);
      setNewProp({
        name: "",
        location: "",
        type: "2BHK Apartment",
        price: "",
        amenities: [],
        status: "Available",
        builder: "",
        sqft: "",
      });
    } catch (err: any) {
      alert("Failed to add property: " + err.message);
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      setNewProp({
        ...newProp,
        amenities: [...(newProp.amenities || []), amenityInput.trim()],
      });
      setAmenityInput("");
    }
  };

  const handleRemoveAmenity = (index: number) => {
    setNewProp({
      ...newProp,
      amenities: (newProp.amenities || []).filter((_, i) => i !== index),
    });
  };

  const handleFaqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqTitle || !faqContent) {
      setFaqStatusMsg("Error: Please provide both a title and FAQ document content.");
      return;
    }
    const newDoc: FaqDoc = {
      id: `FAQ-${Math.floor(100 + Math.random() * 900)}`,
      title: newFaqTitle,
      type: "txt",
      size: `${Math.round(faqContent.length / 100) / 10} KB`,
      date: "Today",
      tokens: `${Math.round(faqContent.split(" ").length * 1.3)} tokens`,
    };
    setFaqs([newDoc, ...faqs]);
    setNewFaqTitle("");
    setFaqContent("");
    setFaqStatusMsg("Success: Document vectorized and ingested into ChromaDB index.");
    setTimeout(() => setFaqStatusMsg(""), 4000);
  };

  const handleDeleteFaq = (id: string) => {
    if (role === "Sales") {
      alert("Unauthorized: Sales role cannot delete knowledge documents.");
      return;
    }
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-electric-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI RAG Resources</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">AI Knowledge Base</h2>
          <p className="text-slate-400 text-sm">
            Configure the property portfolio details and FAQ sheets the AI Receptionist references during conversations.
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex bg-navy-900 border border-navy-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("properties")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "properties"
                ? "bg-electric-500 text-white shadow-md shadow-electric-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
          <span>Properties Portfolio ({propertiesLoading ? "…" : properties.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "faq"
                ? "bg-electric-500 text-white shadow-md shadow-electric-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>AI FAQ Documents ({faqs.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "properties" ? (
        <div className="space-y-6">
          {/* Controls row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search properties by name, location, or configurations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-navy-800 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            {role !== "Sales" && (
              <button
                onClick={() => setIsPropModalOpen(true)}
                className="px-4 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-electric-500/20 hover:shadow-electric-500/35 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Property Listing</span>
              </button>
            )}
          </div>

          {/* Properties portfolio grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {propertiesLoading ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 gap-3">
                <span className="w-6 h-6 border-2 border-t-transparent border-electric-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-bold">Loading property listings from database...</p>
              </div>
            ) : filteredProperties.length > 0 ? (
              filteredProperties.map((p) => (
                <div
                  key={p.id}
                  className="p-6 rounded-2xl bg-navy-900 border border-navy-800 hover:border-navy-700 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID: {p.id}</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          p.status === "Available"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : p.status === "80% Booked"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-100 mb-1">{p.name}</h3>
                    <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {p.location}
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-navy-950/40 p-4 rounded-xl border border-navy-850 mb-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Type</span>
                        <p className="text-sm font-semibold text-slate-300">{p.type}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Sq. Footage</span>
                        <p className="text-sm font-semibold text-slate-300">{p.sqft}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Base Price</span>
                        <p className="text-sm font-bold text-emerald-400">{p.price}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Builder Partner</span>
                        <p className="text-xs font-semibold text-slate-300 truncate">{p.builder}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Amenities</span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.amenities.map((a, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold text-slate-300 bg-navy-950 border border-navy-850 px-2 py-0.5 rounded"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {role !== "Sales" && (
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-navy-850">
                      <button
                        onClick={() => handleDeleteProperty(p.id)}
                        className="p-2 rounded-lg bg-navy-950 border border-navy-800 text-slate-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-500/5 transition-all"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-navy-900 border border-navy-800 rounded-2xl">
                <Building className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No properties match your search.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active FAQ Index */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800">
              <h3 className="text-lg font-bold mb-1">RAG Context Files</h3>
              <p className="text-xs text-slate-400 mb-6">
                These documents are converted to vector representations. The AI chatbot performs semantic search over these files in real-time.
              </p>

              <div className="space-y-3">
                {faqs.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl bg-navy-950/40 border border-navy-800 hover:border-navy-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-electric-500/10 border border-electric-500/20 text-electric-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{f.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{f.type.toUpperCase()} file</span>
                          <span>•</span>
                          <span>{f.size}</span>
                          <span>•</span>
                          <span className="text-gold-500 font-bold">{f.tokens}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 border border-navy-800 px-2 py-0.5 rounded bg-navy-900">
                        Ingested: {f.date}
                      </span>
                      {role !== "Sales" && (
                        <button
                          onClick={() => handleDeleteFaq(f.id)}
                          className="p-2 rounded bg-navy-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-navy-800 hover:border-red-950 transition-all"
                          title="Delete knowledge sheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Prompting Guidelines */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-navy-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gold-500" />
                <h4 className="font-bold text-slate-100">AI Grounding Rules</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our RAG search prioritizes pricing structures and refund terms. The model is specifically instructed to:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5">
                <li>Never promise discounts or deviate from base prices in listings.</li>
                <li>State that all booking tokens are subject to developer approval.</li>
                <li>Politely refuse to answer personal developer questions, steering back to properties.</li>
              </ul>
            </div>
          </div>

          {/* Add Knowledge Doc Form / Upload Zone */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Add FAQ Page</h3>
                <p className="text-xs text-slate-400 mb-4">Paste property guidelines or FAQs directly below to train the receptionist.</p>

                <form onSubmit={handleFaqSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. GST & Parking Fees Schedule"
                      value={newFaqTitle}
                      onChange={(e) => setNewFaqTitle(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Knowledge Text (RAW FAQ)</label>
                    <textarea
                      placeholder="e.g. Q: What is the maintenance fee? A: ₹3.5 per sq.ft monthly payable every quarter..."
                      value={faqContent}
                      onChange={(e) => setFaqContent(e.target.value)}
                      rows={6}
                      className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500 font-sans"
                    />
                  </div>

                  {faqStatusMsg && (
                    <div
                      className={`p-3 rounded-lg flex items-center gap-2 text-xs font-semibold ${
                        faqStatusMsg.startsWith("Success")
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {faqStatusMsg.startsWith("Success") ? (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{faqStatusMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-electric-500/15"
                  >
                    Vectorize and Add
                  </button>
                </form>
              </div>
            </div>

            {/* Document Upload Area mock */}
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 border-dashed border-2 hover:border-navy-700/80 transition-all duration-200 flex flex-col items-center justify-center text-center py-8">
              <UploadCloud className="w-10 h-10 text-slate-400 mb-3 animate-bounce" />
              <h4 className="font-bold text-slate-200 text-sm">Upload PDF / TXT documents</h4>
              <p className="text-slate-500 text-xs mt-1 mb-4 max-w-[200px]">Drag & drop policy files here to parse and chunk into vector store.</p>
              <button
                type="button"
                onClick={() => alert("Upload Simulation: Standard Sandbox limits prevent filesystem file upload. Use manual text entry above.")}
                className="px-3.5 py-1.5 bg-navy-850 hover:bg-navy-800 text-slate-300 hover:text-white border border-navy-800 rounded-lg text-xs font-bold transition-colors"
              >
                Browse Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Input Modal */}
      {isPropModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-navy-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-electric-500" />
                <span>Create Property Listing</span>
              </h3>
              <button
                onClick={() => setIsPropModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProperty} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Property Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Palm Heights Tower B"
                    value={newProp.name || ""}
                    onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Location / Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OMR, Karapakkam"
                    value={newProp.location || ""}
                    onChange={(e) => setNewProp({ ...newProp, location: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Base Price</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹95 Lakhs"
                    value={newProp.price || ""}
                    onChange={(e) => setNewProp({ ...newProp, price: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Property Type</label>
                  <select
                    value={newProp.type || "2BHK Apartment"}
                    onChange={(e) => setNewProp({ ...newProp, type: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:border-electric-500"
                  >
                    <option>2BHK Apartment</option>
                    <option>3BHK Apartment</option>
                    <option>3BHK Villa</option>
                    <option>Commercial Office</option>
                    <option>Residential Plot</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Sq. Footage</label>
                  <input
                    type="text"
                    placeholder="e.g. 1,450 Sq.Ft."
                    value={newProp.sqft || ""}
                    onChange={(e) => setNewProp({ ...newProp, sqft: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Builder Partner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Signature Estates"
                    value={newProp.builder || ""}
                    onChange={(e) => setNewProp({ ...newProp, builder: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Add Amenities</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Gym, Gas Pipeline"
                      value={amenityInput}
                      onChange={(e) => setAmenityInput(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-electric-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddAmenity}
                      className="px-3 bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-navy-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {newProp.amenities && newProp.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {newProp.amenities.map((a, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold text-slate-300 bg-navy-950 border border-navy-850 px-2 py-0.5 rounded flex items-center gap-1"
                        >
                          <span>{a}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAmenity(idx)}
                            className="text-slate-500 hover:text-slate-200 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-navy-850 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPropModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-navy-950 hover:bg-navy-900 border border-navy-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-electric-500 hover:bg-electric-600 text-white text-xs font-bold transition-all shadow-md shadow-electric-500/10"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
