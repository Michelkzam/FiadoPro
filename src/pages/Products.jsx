import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";
import db from "@/lib/db";
import { useProducts } from "@/hooks/useQueries";
import { formatCurrency, PRODUCT_CATEGORIES, MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";

const emptyForm = { name: "", description: "", price: "", category: "", image_url: "", available: true };

export default function Products() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: products = [], isLoading } = useProducts();

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? db.entities.Product.update(editing.id, data)
        : db.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? "Produto atualizado!" : "Produto cadastrado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido!");
    },
  });

  const toggleAvailable = (product) => {
    db.entities.Product.update(product.id, { available: !product.available }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    });
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: p.price || "", category: p.category || "", image_url: p.image_url || "", available: p.available !== false });
    setDialogOpen(true);
  };

  const MAX_FILE_SIZE = MAX_UPLOAD_SIZE;
  const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use: JPG, PNG, WebP ou GIF");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Tamanho máximo: 5MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, image_url: file_url }));
    } catch {
      toast.error("Erro ao enviar imagem. Tente novamente.");
    }
    setUploading(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, price: parseFloat(form.price) || 0 });
  };

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Produtos / Cardápio</h1>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione produtos para exibir no portal do cliente</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h2>
            <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${!p.available ? "text-muted-foreground line-through" : "text-foreground"}`}>{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                    <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleAvailable(p)} className="p-1.5 text-muted-foreground hover:text-primary" title={p.available ? "Disponível" : "Indisponível"}>
                      {p.available ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-primary">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Arroz com feijão" required />
            </div>
            <div>
              <Label>Categoria</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.category === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do produto..." rows={2} />
            </div>
            <div>
              <Label>Imagem</Label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-muted-foreground" />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando imagem...</p>}
              {form.image_url && <img src={form.image_url} className="mt-2 h-16 rounded-lg object-cover" />}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
