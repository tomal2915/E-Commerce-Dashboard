// app/products/add-new-products/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/axios";
import { getErrorMessage, parseFieldErrors } from "@/lib/apiError";
import { ToastProvider, useToast } from "@/components/ToastProvider";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { LoadingState } from "@/components/DataState";
import { MediaPicker } from "@/components/MediaPicker";
import { FieldError } from "@/components/FieldError";
import {
  generateCombinations,
  combinationLabel,
  type AttributeValueOption,
} from "@/lib/productCombinations";

interface Brand {
  id: string;
  name: string;
}
interface CategoryOption {
  id: string;
  name: string;
}
interface AttributeValue {
  id: string;
  value: string;
}
interface Attribute {
  id: string;
  name: string;
  type: string;
  values: AttributeValue[];
}
interface SelectedMedia {
  id: string;
  publicUrl: string;
  isThumbnail: boolean;
}
interface VariantDraft {
  key: string; // stable key for React, built from sorted attributeValueIds
  attributeValueIds: string[];
  label: string;
  sku: string;
  price: string;
  salePrice: string;
  stock: number;
  media: SelectedMedia[];
}

const TABS = ["Details", "Brand & Categories", "Media", "Variants"] as const;
type Tab = (typeof TABS)[number];

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("edit");
  const isEditing = !!editingId;
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("Details");
  const [isLoadingExisting, setIsLoadingExisting] = useState(isEditing);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // ---- Details tab ----
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [status, setStatus] = useState(true);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState(0);

  // ---- Brand & Categories tab ----
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brandId, setBrandId] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());

  // ---- Media tab ----
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // ---- Variants tab ----
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedValuesByAttribute, setSelectedValuesByAttribute] = useState<
    Record<string, AttributeValueOption[]>
  >({});

  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [variantMediaPickerKey, setVariantMediaPickerKey] = useState<
    string | null
  >(null);

  // ---- Load reference data ----
  useEffect(() => {
    api.get("/brands").then((res) => setBrands(res.data.data));
    api.get("/categories").then((res) => setCategories(res.data.data));
    api.get("/attributes").then((res) => setAttributes(res.data.data));
  }, []);

  // ---- Load existing product when editing ----
  useEffect(() => {
    if (!editingId) return;
    api
      .get(`/products/${editingId}`)
      .then((res) => {
        const p = res.data.data;
        setName(p.name);
        setDescription(p.description ?? "");
        setHasVariants(p.hasVariants);
        setStatus(p.status);
        setSku(p.sku ?? "");
        setPrice(p.price ?? "");
        setSalePrice(p.salePrice ?? "");
        setStock(p.stock ?? 0);
        setBrandId(p.brand?.id ?? "");
        setCategoryIds(new Set(p.categories.map((c: any) => c.category.id)));
        setSelectedMedia(
          p.media.map((m: any) => ({
            id: m.mediaId,
            publicUrl: m.media?.publicUrl ?? "",
            isThumbnail: m.isThumbnail,
          })),
        );
        setVariants(
          p.variants.map((v: any) => ({
            key: v.id,
            attributeValueIds: v.attributes.map(
              (a: any) => a.attributeValue.id,
            ),
            label: v.attributes
              .map((a: any) => a.attributeValue.value)
              .join(" / "),
            sku: v.sku,
            price: v.price,
            salePrice: v.salePrice ?? "",
            stock: v.stock,
            media: [],
          })),
        );
      })
      .catch((err) => setGeneralError(getErrorMessage(err)))
      .finally(() => setIsLoadingExisting(false));
  }, [editingId]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAttributeValue(attribute: Attribute, value: AttributeValue) {
    setSelectedValuesByAttribute((prev) => {
      const current = prev[attribute.id] ?? [];
      const exists = current.some((v) => v.id === value.id);
      const option: AttributeValueOption = {
        id: value.id,
        value: value.value,
        attributeId: attribute.id,
        attributeName: attribute.name,
      };
      const next = exists
        ? current.filter((v) => v.id !== value.id)
        : [...current, option];
      return { ...prev, [attribute.id]: next };
    });
  }

  // Builds every combination from selected attribute values and merges with
  // any existing variant rows — preserving SKU/price/stock already entered
  // for combinations that still exist, and dropping rows for deselected ones.
  function handleGenerateCombinations() {
    const combinations = generateCombinations(selectedValuesByAttribute);

    const newVariants: VariantDraft[] = combinations.map((combo) => {
      const key = combo
        .map((v) => v.id)
        .sort()
        .join("-");
      const existing = variants.find((v) => v.key === key);
      return (
        existing ?? {
          key,
          attributeValueIds: combo.map((v) => v.id),
          label: combinationLabel(combo),
          sku: "",
          price: "",
          salePrice: "",
          stock: 0,
          media: [],
        }
      );
    });

    setVariants(newVariants);
  }

  function updateVariant(key: string, field: keyof VariantDraft, value: any) {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
    );
  }

  function setThumbnail(mediaId: string) {
    setSelectedMedia((prev) =>
      prev.map((m) => ({ ...m, isThumbnail: m.id === mediaId })),
    );
  }

  function removeMedia(mediaId: string) {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }

  function moveMedia(index: number, direction: -1 | 1) {
    setSelectedMedia((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit() {
    setGeneralError("");
    setFieldErrors({});

    if (hasVariants && variants.length === 0) {
      setGeneralError("Generate at least one variant before saving.");
      setActiveTab("Variants");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        hasVariants,
        brandId: brandId || undefined,
        categoryIds: Array.from(categoryIds),
        media: selectedMedia.map((m, index) => ({
          mediaId: m.id,
          isThumbnail: m.isThumbnail,
          sortOrder: index,
        })),
        ...(hasVariants
          ? {
              variants: variants.map((v) => ({
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice || undefined,
                stock: v.stock,
                attributeValueIds: v.attributeValueIds,
              })),
            }
          : {
              sku,
              price,
              salePrice: salePrice || undefined,
              stock,
            }),
      };

      if (isEditing) {
        await api.put(`/products/${editingId}`, payload);
        showToast("Product updated", "success");
      } else {
        await api.post("/products", payload);
        showToast("Product created", "success");
      }
      router.push("/products");
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message) setFieldErrors(parseFieldErrors(message));
      setGeneralError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingExisting) {
    return (
      <ProtectedLayout>
        <div className="p-8">
          <LoadingState label="Loading product..." />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          {isEditing ? "Edit Product" : "Create New Product"}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Fill in each section below, then save when you're ready.
        </p>

        {generalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
            {generalError}
          </div>
        )}

        {/* ---- Tabs ---- */}
        <div className="flex gap-1 border-b border-slate-200 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ---- Details Tab ---- */}
        {activeTab === "Details" && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={status}
                onChange={(e) => setStatus(e.target.checked)}
                className="w-4 h-4 accent-slate-900"
              />
              Active (visible in listings)
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasVariants(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    !hasVariants
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  Simple Product
                </button>
                <button
                  type="button"
                  onClick={() => setHasVariants(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    hasVariants
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  Variable Product
                </button>
              </div>
            </div>

            {!hasVariants && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    SKU
                  </label>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <FieldError message={fieldErrors.sku} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    min={0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price
                  </label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <FieldError message={fieldErrors.price} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sale Price (optional)
                  </label>
                  <input
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <FieldError message={fieldErrors.salePrice} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Brand & Categories Tab ---- */}
        {activeTab === "Brand & Categories" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">No brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categories
              </label>
              {categories.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No categories available yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer ${
                        categoryIds.has(c.id)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={categoryIds.has(c.id)}
                        onChange={() => toggleCategory(c.id)}
                        className="hidden"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Media Tab ---- */}
        {activeTab === "Media" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Gallery
            </label>
            <p className="text-xs text-slate-400 mb-3">
              The first image is used as the default order — use the arrows to
              reorder, and "Set as thumbnail" to choose the main listing image.
            </p>

            <div className="flex flex-wrap gap-3 mb-3">
              {selectedMedia.map((m, index) => (
                <div
                  key={m.id}
                  className="relative w-28 h-28 border border-slate-200 rounded-lg overflow-hidden group"
                >
                  <img
                    src={m.publicUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {m.isThumbnail && (
                    <span className="absolute top-1 left-1 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Thumbnail
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveMedia(index, -1)}
                        disabled={index === 0}
                        className="text-white text-xs disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMedia(index, 1)}
                        disabled={index === selectedMedia.length - 1}
                        className="text-white text-xs disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                    {!m.isThumbnail && (
                      <button
                        type="button"
                        onClick={() => setThumbnail(m.id)}
                        className="text-white text-[10px] underline"
                      >
                        Set as thumbnail
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(m.id)}
                      className="text-white text-[10px] underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="w-28 h-28 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-sm hover:border-slate-400 hover:text-slate-500"
              >
                + Add
              </button>
            </div>

            {isPickerOpen && (
              <MediaPicker
                onSelect={(media) => {
                  setSelectedMedia((prev) => [
                    ...prev,
                    {
                      id: media.id,
                      publicUrl: media.publicUrl,
                      isThumbnail: prev.length === 0,
                    },
                  ]);
                  setIsPickerOpen(false);
                }}
                onClose={() => setIsPickerOpen(false)}
              />
            )}
          </div>
        )}

        {/* ---- Variants Tab ---- */}
        {activeTab === "Variants" && (
          <div className="space-y-6">
            {!hasVariants ? (
              <p className="text-sm text-slate-400">
                Switch to "Variable Product" in the Details tab to configure
                variants.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    1. Choose attributes and values
                  </label>
                  {attributes.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No attributes exist yet — create one under Attributes
                      first.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {attributes.map((attr) => (
                        <div key={attr.id}>
                          <p className="text-sm font-medium text-slate-600 mb-1.5">
                            {attr.name}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((val) => {
                              const isSelected = (
                                selectedValuesByAttribute[attr.id] ?? []
                              ).some((v) => v.id === val.id);
                              return (
                                <button
                                  key={val.id}
                                  type="button"
                                  onClick={() =>
                                    toggleAttributeValue(attr, val)
                                  }
                                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border ${
                                    isSelected
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white text-slate-700 border-slate-300"
                                  }`}
                                >
                                  {attr.type === "color" && (
                                    <span
                                      className="w-3 h-3 rounded-full border border-white/50"
                                      style={{ backgroundColor: val.value }}
                                    />
                                  )}
                                  {val.value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCombinations}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
                >
                  Generate Combinations
                </button>

                {variants.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      2. Configure each variant
                    </label>
                    <div className="space-y-3">
                      {variants.map((variant) => (
                        <div
                          key={variant.key}
                          className="border border-slate-200 rounded-xl p-4"
                        >
                          <p className="text-sm font-medium text-slate-800 mb-3">
                            {variant.label}
                          </p>
                          <div className="grid grid-cols-4 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                SKU
                              </label>
                              <input
                                value={variant.sku}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.key,
                                    "sku",
                                    e.target.value,
                                  )
                                }
                                required
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                Price
                              </label>
                              <input
                                value={variant.price}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.key,
                                    "price",
                                    e.target.value,
                                  )
                                }
                                required
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                Sale Price
                              </label>
                              <input
                                value={variant.salePrice}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.key,
                                    "salePrice",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                Stock
                              </label>
                              <input
                                type="number"
                                value={variant.stock}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.key,
                                    "stock",
                                    Number(e.target.value),
                                  )
                                }
                                min={0}
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                          </div>

                          {/* Per-variant image */}
                          <div className="flex items-center gap-2">
                            {variant.media[0] && (
                              <img
                                src={variant.media[0].publicUrl}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setVariantMediaPickerKey(variant.key)
                              }
                              className="text-xs text-slate-500 hover:underline"
                            >
                              {variant.media[0]
                                ? "Change image"
                                : "+ Add variant image"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {variantMediaPickerKey && (
                  <MediaPicker
                    onSelect={(media) => {
                      updateVariant(variantMediaPickerKey, "media", [
                        {
                          id: media.id,
                          publicUrl: media.publicUrl,
                          isThumbnail: true,
                        },
                      ]);
                      setVariantMediaPickerKey(null);
                    }}
                    onClose={() => setVariantMediaPickerKey(null)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ---- Save bar ---- */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Product"}
          </button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
