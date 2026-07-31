// src/app/(dashboard)/products/add-new-products/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/axios";
import { getErrorMessage, parseFieldErrors } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/shared/FieldError";
import { MediaPicker } from "@/components/media/MediaPicker";
import { resolveMediaUrl } from "@/lib/media";
import {
  generateCombinations,
  combinationLabel,
  type AttributeValueOption,
} from "@/lib/productCombinations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  key: string;
  attributeValueIds: string[];
  label: string;
  sku: string;
  price: string;
  salePrice: string;
  stock: number;
}

const TABS = ["Details", "Brand & Categories", "Media", "Variants"] as const;
type Tab = (typeof TABS)[number];

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("edit");
  const isEditing = !!editingId;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("Details");
  const [isLoadingExisting, setIsLoadingExisting] = useState(isEditing);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [activeFlag, setActiveFlag] = useState(true);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState(0);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedValuesByAttribute, setSelectedValuesByAttribute] = useState<
    Record<string, AttributeValueOption[]>
  >({});
  const [variants, setVariants] = useState<VariantDraft[]>([]);

  useEffect(() => {
    api.get("/brands").then((res) => setBrands(res.data.data));
    api.get("/categories").then((res) => setCategories(res.data.data));
    api.get("/attributes").then((res) => setAttributes(res.data.data));
  }, []);

  useEffect(() => {
    if (!editingId) return;
    api
      .get(`/products/${editingId}`)
      .then((res) => {
        const p = res.data.data;
        setName(p.name);
        setShortDescription(p.shortDescription ?? "");
        setLongDescription(p.longDescription ?? "");
        setHasVariants(p.hasVariants);
        setActiveFlag(p.activeFlag);
        setSku(p.sku ?? "");
        setPrice(p.price ?? "");
        setSalePrice(p.salePrice ?? "");
        setStock(p.stock ?? 0);
        setBrandId(p.brand?.id ?? null);
        setCategoryIds(new Set(p.categories.map((c: any) => c.category.id)));
        setSelectedMedia(
          p.media.map((m: any) => ({
            id: m.media.id,
            publicUrl: m.media.publicUrl,
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
        shortDescription: shortDescription || undefined,
        longDescription: longDescription || undefined,
        hasVariants,
        activeFlag,
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
          : { sku, price, salePrice: salePrice || undefined, stock }),
      };

      if (isEditing) {
        await api.put(`/products/${editingId}`, payload);
        toast({ title: "Product updated" });
      } else {
        await api.post("/products", payload);
        toast({ title: "Product created" });
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
      <div className="p-8">
        <Skeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">
        {isEditing ? "Edit Product" : "Create New Product"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Fill in each section below, then save when you're ready.
      </p>

      {generalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
          {generalError}
        </div>
      )}

      <div className="flex gap-1 border-b mb-6">
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

      {activeTab === "Details" && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Product Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Long Description</Label>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={4}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={activeFlag} onCheckedChange={setActiveFlag} />
            Active (visible in listings)
          </label>

          <div>
            <Label className="mb-2 block">Product Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!hasVariants ? "default" : "outline"}
                onClick={() => setHasVariants(false)}
              >
                Simple Product
              </Button>
              <Button
                type="button"
                variant={hasVariants ? "default" : "outline"}
                onClick={() => setHasVariants(true)}
              >
                Variable Product
              </Button>
            </div>
          </div>

          {!hasVariants && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
                <FieldError message={fieldErrors.sku} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="0.00"
                />
                <FieldError message={fieldErrors.price} />
              </div>
              <div className="space-y-1.5">
                <Label>Sale Price (optional)</Label>
                <Input
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                />
                <FieldError message={fieldErrors.salePrice} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Brand & Categories" && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={brandId ?? ""} onValueChange={setBrandId}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="No brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Categories</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories available yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg border ${
                      categoryIds.has(c.id)
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "Media" && (
        <div>
          <Label className="mb-2 block">Product Gallery</Label>
          <p className="text-xs text-muted-foreground mb-3">
            The first image sets initial order — use arrows to reorder, and "Set as thumbnail" to choose the main listing image.
          </p>
          <div className="flex flex-wrap gap-3 mb-3">
            {selectedMedia.map((m, index) => (
              <div
                key={m.id}
                className="relative w-28 h-28 border rounded-lg overflow-hidden group"
              >
                <img
                  src={resolveMediaUrl(m.publicUrl)}
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
              className="w-28 h-28 border-2 border-dashed rounded-lg text-slate-400 text-sm hover:border-slate-400"
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

      {activeTab === "Variants" && (
        <div className="space-y-6">
          {!hasVariants ? (
            <p className="text-sm text-muted-foreground">
              Switch to "Variable Product" in the Details tab to configure
              variants.
            </p>
          ) : (
            <>
              <div>
                <Label className="mb-3 block">
                  1. Choose attributes and values
                </Label>
                {attributes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No attributes exist yet — create one under Attributes first.
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
                                onClick={() => toggleAttributeValue(attr, val)}
                                className={`text-sm px-3 py-1.5 rounded-lg border ${
                                  isSelected
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-700 border-slate-300"
                                }`}
                              >
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

              <Button type="button" onClick={handleGenerateCombinations}>
                Generate Combinations
              </Button>

              {variants.length > 0 && (
                <div>
                  <Label className="mb-3 block">
                    2. Configure each variant
                  </Label>
                  <div className="space-y-3">
                    {variants.map((variant) => (
                      <div key={variant.key} className="border rounded-xl p-4">
                        <p className="text-sm font-medium text-slate-800 mb-3">
                          {variant.label}
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">SKU</Label>
                            <Input
                              value={variant.sku}
                              onChange={(e) =>
                                updateVariant(
                                  variant.key,
                                  "sku",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price</Label>
                            <Input
                              value={variant.price}
                              onChange={(e) =>
                                updateVariant(
                                  variant.key,
                                  "price",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Sale Price</Label>
                            <Input
                              value={variant.salePrice}
                              onChange={(e) =>
                                updateVariant(
                                  variant.key,
                                  "salePrice",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Stock</Label>
                            <Input
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
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/products")}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSaving}>
          {isSaving
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Create Product"}
        </Button>
      </div>
    </div>
  );
}
