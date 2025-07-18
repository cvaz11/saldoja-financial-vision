import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_CATEGORIES = [
  { name: 'Mercado', color: 'bg-sage-100 text-sage-700' },
  { name: 'Restaurante', color: 'bg-blue-100 text-blue-700' },
  { name: 'Transporte', color: 'bg-purple-100 text-purple-700' },
  { name: 'Assinaturas', color: 'bg-green-100 text-green-700' },
  { name: 'Eletrônicos', color: 'bg-orange-100 text-orange-700' },
];

interface Category {
  name: string;
  color: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load categories from localStorage or use defaults
    const stored = localStorage.getItem('user_categories');
    if (stored) {
      try {
        setCategories(JSON.parse(stored));
      } catch {
        setCategories(DEFAULT_CATEGORIES);
      }
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  const saveCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    localStorage.setItem('user_categories', JSON.stringify(newCategories));
  };

  const addCategory = (name: string) => {
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria não pode estar vazio",
        variant: "destructive",
      });
      return false;
    }

    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      toast({
        title: "Erro",
        description: "Categoria já existe",
        variant: "destructive",
      });
      return false;
    }

    const colors = [
      'bg-red-100 text-red-700',
      'bg-yellow-100 text-yellow-700',
      'bg-indigo-100 text-indigo-700',
      'bg-pink-100 text-pink-700',
      'bg-teal-100 text-teal-700',
    ];

    const newCategory = {
      name: name.trim(),
      color: colors[categories.length % colors.length]
    };

    const newCategories = [...categories, newCategory];
    saveCategories(newCategories);

    toast({
      title: "Sucesso",
      description: `Categoria "${name}" adicionada`,
    });
    return true;
  };

  const removeCategory = (name: string) => {
    const newCategories = categories.filter(cat => cat.name !== name);
    saveCategories(newCategories);
    
    toast({
      title: "Sucesso",
      description: `Categoria "${name}" removida`,
    });
  };

  return {
    categories,
    addCategory,
    removeCategory
  };
};