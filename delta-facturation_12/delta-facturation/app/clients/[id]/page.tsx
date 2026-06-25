'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Poste = {
  id: string;
  client_id: string;
  type_poste: 'agent_jour' | 'agent_nuit' | 'chef_jour' | 'chef_nuit';
  quantite: number;
  prix_unitaire: number;
  actif: boolean;
};

type Client = { id: string; nom: string };

const LABELS: Record<Poste['type_poste'], string> = {
  agent_jour: '☀ Agent sécurité — Jour',
  agent_nuit: '☾ Agent sécurité — Nuit',
  chef_jour: "★ Chef d'équipe — Jour",
  chef_nuit: "★ Chef d'équipe — Nuit",
};

const ORDRE: Poste['type_poste'][] = ['agent_jour', 'agent_nuit', 'chef_jour', 'chef_nuit'];

export default function PostesClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [postes, setPostes] = useState<Record<string, Poste>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  async function charger() {
    setLoading(true);
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('id', clientId)
      .single();

    if (clientErr) {
      setErrorMsg(clientErr.message);
      setLoading(false);
      return;
    }
    setClient(clientData);

    const { data: postesData, error: postesErr } = await supabase
      .from('postes')
      .select('*')
      .eq('client_id', clientId);

    if (postesErr) {
      setErrorMsg(postesErr.message);
    } else {
      const map: Record<string, Poste> = {};
      (postesData as Poste[]).forEach((p) => {
        map[p.type_poste] = p;
      });
      setPostes(map);
      setErrorMsg(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    charger();
  }, [clientId]);

  function getValeur(type: Poste['type_poste']) {
    return postes[type] || { quantite: 0, prix_unitaire: 0, actif: type.startsWith('agent') };
  }

  function modifierChamp(type: Poste['type_poste'], champ: 'quantite' | 'prix_unitaire', valeur: string) {
    setPostes((prev) => ({
      ...prev,
      [type]: {
        ...getValeur(type),
        id: prev[type]?.id || '',
        client_id: clientId,
        type_poste: type,
        [champ]: parseInt(valeur, 10) || 0,
        actif: true,
      } as Poste,
    }));
  }

  function ajouterChef(type: 'chef_jour' | 'chef_nuit') {
    setPostes((prev) => ({
      ...prev,
      [type]: {
        id: '',
        client_id: clientId,
        type_poste: type,
        quantite: 1,
        prix_unitaire: 130000,
        actif: true,
      },
    }));
  }

  function retirerChef(type: 'chef_jour' | 'chef_nuit') {
    setPostes((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
  }

  async function enregistrer() {
    setSaving(true);
    setErrorMsg(null);

    // On enregistre uniquement les postes présents dans l'état (agent jour/nuit toujours,
    // chef jour/nuit seulement s'ils ont été ajoutés)
    const lignes = Object.values(postes).map((p) => ({
      client_id: clientId,
      type_poste: p.type_poste,
      quantite: p.quantite,
      prix_unitaire: p.prix_unitaire,
      actif: true,
    }));

    // On retire d'abord les anciens postes de ce client, puis on réinsère l'état actuel
    // (simple et fiable pour un volume de 4 lignes max par client)
    const { error: delErr } = await supabase.from('postes').delete().eq('client_id', clientId);
    if (delErr) {
      setErrorMsg(delErr.message);
      setSaving(false);
      return;
    }

    if (lignes.length > 0) {
      const { error: insErr } = await supabase.from('postes').insert(lignes);
      if (insErr) {
        setErrorMsg(insErr.message);
        setSaving(false);
        return;
      }
    }

    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
    setSaving(false);
    await charger();
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F3F1EA] p-10 text-sm text-[#5A6B76]">Chargement...</main>;
  }

  if (errorMsg && !client) {
    return (
      <main className="min-h-screen bg-[#F3F1EA] p-10">
        <p className="text-red-700 text-sm">Erreur : {errorMsg}</p>
      </main>
    );
  }

  const chefJourActif = !!postes['chef_jour'];
  const chefNuitActif = !!postes['chef_nuit'];

  return (
    <main className="min-h-screen bg-[#F3F1EA] p-10">
      <button
        onClick={() => router.push('/clients')}
        className="text-xs text-[#5A6B76] hover:underline mb-4"
      >
        ← Retour aux clients
      </button>

      <h1 className="text-2xl font-bold text-[#0F1B2D] mb-1">{client?.nom}</h1>
      <p className="text-sm text-[#5A6B76] mb-6">Postes facturés pour ce client</p>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
          Erreur : {errorMsg}
        </div>
      )}

      <div className="bg-white border border-[#D9D4C7] rounded p-6 flex flex-col gap-3 max-w-2xl">
        {(['agent_jour', 'agent_nuit'] as const).map((type) => {
          const v = getValeur(type);
          return (
            <div
              key={type}
              className={`grid grid-cols-[1fr_90px_120px_110px] gap-3 items-center p-3 rounded ${
                type === 'agent_jour' ? 'bg-[#FAF1E2] border-l-4 border-[#C8862E]' : 'bg-[#EEF1F3] border-l-4 border-[#1E3A52]'
              }`}
            >
              <label className="text-sm font-semibold text-[#0F1B2D]">{LABELS[type]}</label>
              <input
                type="number"
                value={v.quantite}
                onChange={(e) => modifierChamp(type, 'quantite', e.target.value)}
                className="border border-[#D9D4C7] rounded px-2 py-1.5 text-sm font-mono"
                placeholder="Qté"
              />
              <input
                type="number"
                value={v.prix_unitaire}
                onChange={(e) => modifierChamp(type, 'prix_unitaire', e.target.value)}
                className="border border-[#D9D4C7] rounded px-2 py-1.5 text-sm font-mono"
                placeholder="Prix unitaire"
              />
              <span className="text-right font-mono text-sm font-semibold text-[#0F1B2D]">
                {(v.quantite * v.prix_unitaire).toLocaleString('fr-FR').replace(/,/g, ' ')} F
              </span>
            </div>
          );
        })}

        {(['chef_jour', 'chef_nuit'] as const).map((type) => {
          if (!postes[type]) return null;
          const v = getValeur(type);
          return (
            <div
              key={type}
              className="grid grid-cols-[1fr_90px_120px_110px_30px] gap-3 items-center p-3 rounded bg-[#F0E9DC] border-l-4 border-[#8A6A3A]"
            >
              <label className="text-sm font-semibold text-[#0F1B2D]">{LABELS[type]}</label>
              <input
                type="number"
                value={v.quantite}
                onChange={(e) => modifierChamp(type, 'quantite', e.target.value)}
                className="border border-[#D9D4C7] rounded px-2 py-1.5 text-sm font-mono"
              />
              <input
                type="number"
                value={v.prix_unitaire}
                onChange={(e) => modifierChamp(type, 'prix_unitaire', e.target.value)}
                className="border border-[#D9D4C7] rounded px-2 py-1.5 text-sm font-mono"
              />
              <span className="text-right font-mono text-sm font-semibold text-[#0F1B2D]">
                {(v.quantite * v.prix_unitaire).toLocaleString('fr-FR').replace(/,/g, ' ')} F
              </span>
              <button
                onClick={() => retirerChef(type)}
                title="Retirer ce poste"
                className="text-[#A3432F] text-sm"
              >
                ✕
              </button>
            </div>
          );
        })}

        <div className="flex gap-2 mt-1">
          {!chefJourActif && (
            <button
              onClick={() => ajouterChef('chef_jour')}
              className="text-xs border border-dashed border-[#D9D4C7] rounded px-3 py-2 text-[#1E3A52] font-semibold hover:bg-[#F3F1EA]"
            >
              + Chef d&apos;équipe jour
            </button>
          )}
          {!chefNuitActif && (
            <button
              onClick={() => ajouterChef('chef_nuit')}
              className="text-xs border border-dashed border-[#D9D4C7] rounded px-3 py-2 text-[#1E3A52] font-semibold hover:bg-[#F3F1EA]"
            >
              + Chef d&apos;équipe nuit
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#D9D4C7]">
          <button
            onClick={enregistrer}
            disabled={saving}
            className="bg-[#0F1B2D] text-white text-sm font-semibold px-5 py-2 rounded disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les postes'}
          </button>
          {savedMsg && <span className="text-sm text-[#4A7C59] font-semibold">✓ Enregistré</span>}
        </div>
      </div>
    </main>
  );
}
