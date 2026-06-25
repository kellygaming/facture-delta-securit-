'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Client = {
  id: string;
  nom: string;
  prefixe_facture: string | null;
  dernier_numero_bon: number;
  actif: boolean;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Champs du formulaire d'ajout
  const [nom, setNom] = useState('');
  const [prefixe, setPrefixe] = useState('');
  const [dernierNumero, setDernierNumero] = useState('');
  const [saving, setSaving] = useState(false);

  async function chargerClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setClients(data as Client[]);
      setErrorMsg(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    chargerClients();
  }, []);

  async function ajouterClient(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;

    setSaving(true);
    const { error } = await supabase.from('clients').insert({
      nom: nom.trim(),
      prefixe_facture: prefixe.trim() || null,
      dernier_numero_bon: dernierNumero ? parseInt(dernierNumero, 10) : 0,
      actif: true,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setNom('');
      setPrefixe('');
      setDernierNumero('');
      await chargerClients();
    }
    setSaving(false);
  }

  async function supprimerClient(id: string) {
    if (!confirm('Retirer ce client de la liste ?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      setErrorMsg(error.message);
    } else {
      await chargerClients();
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F1EA] p-10">
      <h1 className="text-2xl font-bold text-[#0F1B2D] mb-1">Clients</h1>
      <p className="text-sm text-[#5A6B76] mb-6">
        Liste des sociétés facturées chaque mois.
      </p>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
          Erreur : {errorMsg}
        </div>
      )}

      {/* Formulaire d'ajout */}
      <form
        onSubmit={ajouterClient}
        className="bg-white border border-[#D9D4C7] rounded p-5 mb-8 flex flex-wrap gap-4 items-end"
      >
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-[#5A6B76] uppercase mb-1">
            Nom du client *
          </label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Bon Prix Bassam"
            className="border border-[#D9D4C7] rounded px-3 py-2 text-sm w-64"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-[#5A6B76] uppercase mb-1">
            Préfixe facture
          </label>
          <input
            value={prefixe}
            onChange={(e) => setPrefixe(e.target.value)}
            placeholder="Ex: 24312H028"
            className="border border-[#D9D4C7] rounded px-3 py-2 text-sm w-44 font-mono"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-[#5A6B76] uppercase mb-1">
            Dernier n° de bon utilisé
          </label>
          <input
            value={dernierNumero}
            onChange={(e) => setDernierNumero(e.target.value)}
            placeholder="Ex: 505"
            type="number"
            className="border border-[#D9D4C7] rounded px-3 py-2 text-sm w-36 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-[#0F1B2D] text-white text-sm font-semibold px-5 py-2 rounded disabled:opacity-50"
        >
          {saving ? 'Ajout...' : '+ Ajouter le client'}
        </button>
      </form>

      {/* Liste des clients */}
      {loading ? (
        <p className="text-sm text-[#5A6B76]">Chargement...</p>
      ) : clients.length === 0 ? (
        <p className="text-sm text-[#5A6B76]">
          Aucun client encore enregistré — ajoute le premier ci-dessus.
        </p>
      ) : (
        <table className="w-full bg-white border border-[#D9D4C7] rounded overflow-hidden text-sm">
          <thead className="bg-[#FAF9F5] text-[#5A6B76] text-xs uppercase">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Préfixe facture</th>
              <th className="text-left p-3">Dernier n° bon</th>
              <th className="text-left p-3">Prochain n°</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-[#D9D4C7]">
                <td className="p-3 font-semibold text-[#0F1B2D]">{c.nom}</td>
                <td className="p-3 font-mono text-xs">{c.prefixe_facture || '—'}</td>
                <td className="p-3 font-mono text-xs">{c.dernier_numero_bon}</td>
                <td className="p-3 font-mono text-xs text-[#C8862E] font-semibold">
                  {c.dernier_numero_bon + 1}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => supprimerClient(c.id)}
                    className="text-[#A3432F] text-xs hover:underline"
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
